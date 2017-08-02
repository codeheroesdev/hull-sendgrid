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

  synchronizedSegments: Array;
  synchronizedTraits: Array;

  constructor(ctx: Object) {
    this.client = ctx.client;
    this.ship = ctx.ship;
    this.segments = ctx.segments;

    this.sendgridClient = new SendgridClient(ctx);
    this.segmentMapper = new SegmentMapper(ctx, this.sendgridClient);
    this.traitMapper = new TraitMapper(ctx, this.sendgridClient);
    this.userMapper = new UserMapper(ctx);

    this.synchronizedSegments = _.get(ctx, "ship.private_settings.synchronized_segments");
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
    return this.segmentMapper.sync(this.segments.filter(segment => _.includes(this.synchronizedSegments, segment.id)))
      .then(() => this.traitMapper.sync(this.synchronizedTraits));
  }

  filterOutgoingUsers(users: Array<Object>, isBatch: Boolean) {
    const userDeletionEnabled = this.ship.private_settings.enable_user_deletion;

    return users.filter((message) => {
      this.client.logger.asUser(message.user).debug("outoing.user.start", message.user);

      // if () {

      // }
      return true;
    });

    // if (isBatch && userDeletionEnabled)
  }

  sendNotifications(messages: Array<Object>) {
    const usersAlreadyAdded = messages.filter((message) => message.user["traits_sendgrid/id"]);
    const usersToAdd = messages.filter((message) => !message.user["traits_sendgrid/id"]);
    const contacts = usersToAdd.map(message => this.userMapper.mapUserToSendgrid(message.user));

    return this.sendgridClient.request("post", "/contactdb/recipients")
      .send(contacts)
      .then((res) => {
        console.log("SENDGRID", res);
        const successEmails = res.body.persisted_recipients.map(recipient => ({ user: { email: Buffer.from(recipient, "base64").toString() } }));
        const successUsers = _.intersectionBy(messages, successEmails, "user.email");
        const failedUsers = _.flatten(res.body.errors.map(({ error_indices, message }) => {
          const usersWithError = this._intersectionIndex(usersToAdd, error_indices);
          return usersWithError.filter(({ user }) => {
            if (_.intersectionBy(successUsers, [user], "email").length > 0) {
              return false;
            }
            this.client.asUser(user).logger.error("outoing.user.error", { errors: message });
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
          return this.client.asUser(user).logger.error("outoing.user.error", { errors: "Unknown error" });
        });
        return successUsers;
      })
      .then((successUsers) => {
        const usersToAddToLists = _.concat(successUsers, usersAlreadyAdded);

        const operations = _.reduce(usersToAddToLists, (acc, user) => {
          _.map(user.segments, (segment) => {
            const listId = this.segmentMapper.getListId(segment.id);
            acc[listId] = acc[listId] || [];
            const encodedEmail = this._encodeBase64(user.user.email);
            acc[listId].push(encodedEmail);
          });
          return acc;
        }, {});

        return Promise.all(_.map(operations, (list, listId) => {
          return this.sendgridClient.request("post", `/contactdb/lists/${listId}/recipients`)
            .send(list)
            .then((response) => {
              console.log(response.body, response.status);
            });
        }));
      });
  }

  _encodeBase64(string) {
    return Buffer.from(string).toString("base64");
  }

  _intersectionIndex(array, indices) {
    return indices.map(i => array[i]);
  }
}
