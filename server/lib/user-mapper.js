// @flow
import _ from "lodash";

export default class UserMapper {
  userMapping: Array<Object>;

  constructor(ctx: Object) {
    this.userMapping = _.get(ctx.ship, "private_settings.synchronized_attributes");
  }

  getSendgridFields() {

  }

  getHullTraits() {

  }

  mapUserToSendgrid(user: Object) {
    const recipient = {
      email: user.email
    };

    _.reduce(this.userMapping, (acc, field) => {
      if (_.get(user, field.hull)) {
        acc[field.name] = _.get(user, field.hull);
      }

      return acc;
    }, recipient);

    return recipient;
  }

  mapRecipientToHull(recipient: Object) {
    return {
      first_name: {
        operation: "setIfNull",
        value: recipient.first_name
      },
      last_name: {
        operation: "setIfNull",
        value: recipient.last_name
      },
      "sendgrid/last_clicked": recipient.last_clicked,
      "sendgrid/last_opened": recipient.last_opened,
      "sendgrid/updated_at": recipient.updated_at,
      "sendgrid/created_at": recipient.created_at
    };
  }
}
