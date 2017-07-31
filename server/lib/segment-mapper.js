// @flow
import _ from "lodash";
import Promise from "bluebird";

import { Context } from "../interface";

/**
 * Class which maps Hull Segments into appriopriate 3rd party objects list
 */
export default class SegmentMapper {
  mapping: Object;
  originalMapping: Object;

  sendgridClient: Object;
  helpers: Object;

  constructor(ctx: Context, sendgridClient) {
    this.sendgridClient = sendgridClient;

    this.mapping = _.get(ctx, "ship.private_settings.segments_mapping", {});
    this.originalMapping = _.cloneDeep(this.mapping);
    this.helpers = ctx.helpers;
  }

  getListId(segmentId) {
    return this.mapping[segmentId];
  }

  sync(segments: Array<Object> = []) {
    const segmentsAlreadyMapped = _.map(this.mapping, (listId, id) => ({ id }));
    const newSegments = _.differenceBy(segments, segmentsAlreadyMapped, "id");
    const oldSegments = _.differenceBy(segmentsAlreadyMapped, segments, "id");

    return Promise.map(newSegments, segment => {
      return this.createObject(segment);
    }, { concurrency: 1 })
    .then(() => {
      return Promise.map(oldSegments, segment => {
        return this.deleteObject(segment);
      }, { concurrency: 3 });
    })
    .then(() => this.persist());
  }

  createObject(segment: Object) {
    return this.sendgridClient.request("post", "/contactdb/lists")
      .send({
        name: `[Hull] ${segment.name}`
      })
      .then((res) => {
        console.log("SEGMET TESDAF@$@@#$!@$@#$!@#", res);
        this.mapping[segment.id] = res.body.id;
        return res.body.id;
      })
      .catch((err) => {
        if (err.status === 400) {
          if (_.get(err, "response.body.errors[0].message") === "This list name is already in use. Please choose a new, unique name.") {

          }
        }
      });
  }

  deleteObject(segment: Object) {
    console.log("deleteObject", { segment });
    return Promise.resolve();
    // return this.sendgridClient.delete("/");
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
