// @flow
import _ from "lodash";
import Promise from "bluebird";

import { Context } from "../interface";
import SendgridClient from "./sendgrid-client";

/**
 * Class which maps Hull Segments into appriopriate 3rd party objects list
 */
export default class SegmentMapper {
  mapping: Object;
  originalMapping: Object;

  sendgridClient: Object;
  helpers: Object;
  cache: Object;

  constructor(ctx: Context, sendgridClient: SendgridClient) {
    this.sendgridClient = sendgridClient;

    this.mapping = _.get(ctx, "ship.private_settings.segments_mapping", {}) || {};
    this.originalMapping = _.cloneDeep(this.mapping);
    this.helpers = ctx.helpers;
    this.cache = ctx.cache;
  }

  getListId(segmentId: String) {
    return _.get(this.mapping, segmentId);
  }

  getSyncedListIds() {
    return _.values(this.mapping);
  }

  sync(segments: Array<Object> = []) {
    return this.cache.wrap("lists", () => {
      return this.sendgridClient.request("get", "/contactdb/lists");
    })
      .then((res) => {
        _.map(res.body.lists, (list) => {
          if (list.name.match("[Hull]")) {
            const name = list.name.replace("[Hull] ", "");
            const segment = _.find(segments, { name });
            if (segment) {
              this.mapping[segment.id] = list.id;
            }
          }
        });
      })
      .then(() => {
        const segmentsAlreadyMapped = _.map(this.mapping, (listId, id) => ({ id }));
        const newSegments = _.differenceBy(segments, segmentsAlreadyMapped, "id");
        return Promise.map(newSegments, segment => {
          return this.createObject(segment);
        }, { concurrency: 1 })
        .then(() => this.persist());
      });
  }

  createObject(segment: Object) {
    return this.sendgridClient.post("/contactdb/lists", {
      name: `[Hull] ${segment.name}`
    })
      .then((res) => {
        this.mapping[segment.id] = res.body.id;
        return res.body.id;
      })
      .catch((err) => {
        console.error(err);
        // if (err.status === 400) {
        //   if (_.get(err, "response.body.errors[0].message") === "This list name is already in use. Please choose a new, unique name.") {

        //   }
        // }
      });
  }

  getObjects() {
    return this.sendgridClient.get("/contactdb/lists").then(res => {
      return res.body;
    });
  }

  persist() {
    if (_.isEqual(this.originalMapping, this.mapping)) {
      return Promise.resolve();
    }
    const newSettings = {};
    newSettings.segments_mapping = this.mapping;
    return this.helpers.updateSettings(newSettings);
  }
}
