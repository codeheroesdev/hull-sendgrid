// @flow
import _ from "lodash";
import Promise from "bluebird";

import { Context } from "../interface";

/**
 * Class which maps Hull traits into appriopriate 3rd party objects list
 */
export default class TraitMapper {
  mapping: Object;
  originalMapping: Object;

  sendgridClient: Object;
  helpers: Object;

  constructor(ctx: Context, sendgridClient) {
    this.sendgridClient = sendgridClient;

    this.mapping = _.get(ctx, "ship.private_settings.traits_mapping", []);
    this.originalMapping = _.cloneDeep(this.mapping);
    this.helpers = ctx.helpers;
  }

  sync(traits: Array<Object> = []) {
    const traitsAlreadyMapped = this.mapping.map(id => ({ id }));
    const newTraits = _.differenceBy(traits, traitsAlreadyMapped, "id");
    const oldTraits = _.differenceBy(traitsAlreadyMapped, traits, "id");

    return Promise.map(newTraits, trait => {
      return this.createObject(trait);
    }, { concurrency: 1 })
    .then(() => {
      return Promise.map(oldTraits, trait => {
        return this.deleteObject(trait);
      }, { concurrency: 3 });
    })
    .then(() => this.persist());
  }

  createObject(trait) {
    return this.sendgridClient.post("/");
  }

  deleteObject(trait) {
    return this.sendgridClient.delete("/");
  }

  persist() {
    if (_.isEqual(this.originalMapping, this.mapping)) {
      return Promise.resolve();
    }
    const newSettings = {};
    newSettings.traits_mapping = this.mapping;
    return this.helpers.updateSettings(newSettings);
  }
}
