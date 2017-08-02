import _ from "lodash";
import Promise from "bluebird";
import { Client } from "hull";

import SendgridClient from "./sendgrid-client";
import SegmentMapper from "./segment-mapper";
import TraitMapper from "./trait-mapper";
import UserMapper from "./user-mapper";

/**
 * SyncAgent performs logic
 */
export default class SyncAgent {
  sendgridClient: SendgridClient;
  segmentMapper: SegmentMapper;
  client: Client;
  ship: Object;
  traitMapper: TraitMapper;

  synchronizedSegments: Array<Object>;
  synchronizedTraits: Array<Object>;

  constructor(ctx: Object, bottleneck: Object) {
    this.client = ctx.client;
    this.ship = ctx.ship;
    this.segments = ctx.segments;
    this.isBatch = _.has(ctx.options, "format") && _.has(ctx.options, "url");

    this.sendgridClient = new SendgridClient(ctx, bottleneck);
    this.segmentMapper = new SegmentMapper(ctx, this.sendgridClient);
    this.traitMapper = new TraitMapper(ctx, this.sendgridClient);
    this.userMapper = new UserMapper(ctx);

    this.synchronizedSegments = _.intersectionBy(this.segments, _.get(ctx, "ship.private_settings.synchronized_segments", []).map(s => ({ id: s })), "id");
    this.synchronizedTraits = _.get(ctx, "ship.private_settings.synchronized_attributes");
  }

  /**
   * Is connector configured and able to run it's operations?
   * @return {Boolean}
   */
  isConfigured() {
    return this.sendgridClient.isConfigured();
  }

  /**
   * [sync description]
   * @return {[type]} [description]
   */
  sync() {
    return this.segmentMapper.sync(this.synchronizedSegments)
      .then(() => this.traitMapper.sync(this.synchronizedTraits))
      .catch((err) => {
        this.client.logger.error("connector.sync.error", err);
      });
  }

  // filterMessages(messages: Array<Object>) {

  //   return messages.filter((message) => {
  //     this.client.logger.asUser(message.user).debug("outoing.user.start", message.user);

  //     // if we are handling batch pass everybody
  //     if (this.isBatch) {
  //       return true;
  //     }

  //     return _.intersectionBy(message.segments, this.synchronizedSegments, "id").length > 0 ||;
  //   });
  // }

  sendNotifications(messages: Array<Object>) {
    const userDeletionEnabled = this.ship.private_settings.enable_user_deletion;

    const usersAlreadyAdded = messages.filter((message) => message.user["traits_sendgrid/id"]);
    const usersToAdd = messages.filter((message) => {
      if (userDeletionEnabled && _.intersectionBy(message.segments, this.synchronizedSegments, "id").length === 0) {
        this.client.logger.asUser(message.user).info("outgoing.user.skip", { reason: "" });
        return false;
      }

      if (!this.isBatch && _.intersectionBy(message.segments, this.synchronizedSegments, "id").length === 0) {
        this.client.logger.asUser(message.user).info("outgoing.user.skip", { reason: "" });
        return false;
      }
      return !message.user["traits_sendgrid/id"];
    });
    const contacts = usersToAdd.map(message => this.userMapper.mapUserToSendgrid(message.user));

    return this.sendgridClient.post("/contactdb/recipients", contacts)
      .then((res) => {
        const successEmails = res.body.persisted_recipients.map(recipient => ({ user: { email: Buffer.from(recipient, "base64").toString() } }));
        const successUsers = _.intersectionBy(messages, successEmails, "user.email");
        const failedUsers = _.flatten(_.get(res, "body.errors", []).map(({ error_indices, message }) => {
          const usersWithError = this._intersectionIndex(usersToAdd, error_indices);
          return usersWithError.filter(({ user }) => {
            if (_.intersectionBy(successUsers, [user], "email").length > 0) {
              return false;
            }
            this.client.asUser(user).logger.error("outgoing.user.error", { errors: message });
            if (message.match("The email address you added is invalid")) {
              this.client.asUser(user).traits({
                "sendgrid/invalid_reason": message,
                "sendgrid/invalid_at": new Date(),
              });
            }
            return true;
          });
        }));

        const missingUsers = _.differenceBy(usersToAdd, _.concat(failedUsers, successUsers), "email");
        missingUsers.map(({ user }) => {
          return this.client.asUser(user).logger.error("outgoing.user.error", { errors: "Unknown error" });
        });
        return successUsers;
      })
      .then((successUsers) => {
        let usersToAddToLists;
        if (!userDeletionEnabled) {
          usersToAddToLists = _.concat(successUsers, usersAlreadyAdded);
          return Promise.resolve(usersToAddToLists);
        }
        usersToAddToLists = successUsers;

        const usersToDelete = usersAlreadyAdded.filter((message) => {
          return _.intersectionBy(message.segments, this.synchronizedSegments, "id").length === 0;
        });
        const payload = usersToDelete.map(message => {
          this.client.asUser(message.user).logger.info("outgoing.user.delete");
          return this._encodeBase64(message.user.email);
        });
        return this.sendgridClient("delete", "/contactdb/recipients")
          .send(payload)
          .then(() => {
            return usersToAddToLists;
          });
      })
      .then((usersToAddToLists) => {
        const operations = _.reduce(usersToAddToLists, (acc, user) => {
          _.map(user.segments, (segment) => {
            const listId = this.segmentMapper.getListId(segment.id);
            if (!listId) {
              return acc;
            }
            acc[listId] = acc[listId] || [];
            const encodedEmail = this._encodeBase64(user.user.email);
            return acc[listId].push(encodedEmail);
          });
          return acc;
        }, {});

        return Promise.all(_.map(operations, (list, listId) => {
          return this.sendgridClient.post(`/contactdb/lists/${listId}/recipients`, list);
        }));
      })
      .catch((err) => {
        this.client.logger.error("outgoing.job.error", err);
      });
  }

  fetchRecipients({ page, pageSize }) {
    return this.sendgridClient.get("/contactdb/recipients", {
      page,
      page_size: pageSize
    })
    .then(res => {
      return res.body.recipients;
    })
    .catch(res => {
      this.client.logger.error("incoming.job.error", res);
    });
  }

  saveRecipient(recipient) {
    const asUser = this.client.asUser({ email: recipient.email, anonymous_id: `sendgrid:${recipient.id}` });
    return asUser.traits(this.userMapper.mapRecipientToHull(recipient))
    .then(() => {
      asUser.logger.info("incoming.user.success");
    })
    .catch(() => {
      asUser.logger.error("incoming.user.error");
    });
  }

  _encodeBase64(string) {
    return Buffer.from(string).toString("base64");
  }

  _intersectionIndex(array, indices) {
    return indices.map(i => array[i]);
  }
}
