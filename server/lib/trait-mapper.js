// @flow
import _ from "lodash";
import Promise from "bluebird";

import SendgridClient from "./sendgrid-client";
import { Context } from "../interface";

/**
 * Class which maps Hull traits into appriopriate 3rd party objects list
 */
export default class TraitMapper {
  mapping: Object;
  originalMapping: Object;

  sendgridClient: SendgridClient;
  helpers: Object;

  constructor(ctx: Context, sendgridClient) {
    this.sendgridClient = sendgridClient;

    this.mapping = _.get(ctx, "ship.private_settings.traits_mapping", []);
    this.originalMapping = _.cloneDeep(this.mapping);
    this.helpers = ctx.helpers;
  }

  sync(traits: Array<Object> = []) {
    const newTraits = _.differenceBy(traits, this.mapping, "name");
    const oldTraits = _.differenceBy(this.mapping, traits, "name");

    return Promise.map(newTraits, trait => {
      return this.createCustomField(trait);
    }, { concurrency: 1 })
    .then(() => {
      return Promise.map(oldTraits, trait => {
        return this.deleteCustomField(trait);
      }, { concurrency: 3 });
    })
    .then(() => this.persist());
  }

  createCustomField(trait) {
    return this.sendgridClient.post("/contactdb/custom_fields", {
      name: trait.name,
      type: "text"
    }).then(res => {
      this.mapping.push({
        ...trait,
        sendgrid_field_id: res.body.id
      });
    });
  }

  deleteCustomField(trait) {
    return this.sendgridClient.delete(`/contactdb/custom_fields/${trait.sendgrid_field_id}`)
      .then(() => {
        _.remove(this.mapping, property => property.sendgrid_field_id === trait.sendgrid_field_id);
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
