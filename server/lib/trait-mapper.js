// @flow
import _ from "lodash";
import Promise from "bluebird";

import SendgridClient from "./sendgrid-client";
import { Context } from "../interface";

/**
 * Class which maps Hull traits into appriopriate 3rd party objects list
 */
export default class TraitMapper {
  mapping: Array<string>;
  originalMapping: Array<string>;

  sendgridClient: SendgridClient;
  helpers: Object;

  constructor(ctx: Context, sendgridClient: Object) {
    this.sendgridClient = sendgridClient;

    this.mapping = _.get(ctx, "ship.private_settings.traits_mapping", []) || [];
    this.originalMapping = _.cloneDeep(this.mapping);
    this.helpers = ctx.helpers;
  }

  sync(traits: Array<Object> = []) {
    traits = traits.map(t => t.name);
    const newTraits = _.difference(traits, this.mapping);

    return Promise.map(newTraits, trait => {
      return this.createCustomField(trait);
    }, { concurrency: 1 })
    .then(() => this.persist());
  }

  createCustomField(trait: string) {
    return this.sendgridClient.post("/contactdb/custom_fields", {
      name: trait,
      type: "text"
    }).then(() => {
      this.mapping.push(trait);
    })
    .catch((err) => {
      if (err.response.body.errors[0].message.match("This field name is already in use")) {
        this.mapping.push(trait);
      }
    });
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
