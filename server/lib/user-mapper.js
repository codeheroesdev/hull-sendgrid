// @flow
import _ from "lodash";

const defaultMapping = [
  { hull: "sendgrid/email_bouncing", name: "" },
  { hull: "sendgrid/is_blocked", name: "" },
  { hull: "sendgrid/last_clicked", name: "" },
  { hull: "sendgrid/last_opened", name: "" },
  { hull: "sendgrid/updated_at", name: "" },
  { hull: "sendgrid/created_at", name: "" },
  { hull: "sendgrid/invalid_reason", name: "" },
  { hull: "sendgrid/invalid_at", name: "" }
];

export default class UserMapper {
  userMapping: Array;

  constructor(ctx) {
    this.userMapping = _.get(ctx.ship, "private_settings.synchronized_attributes");
  }

  getSendgridFields() {

  }

  getHullTraits() {

  }

  mapUserToSendgrid(user) {
    return {
      email: user.email
    };
  }

  mapUserToHull() {

  }
}
