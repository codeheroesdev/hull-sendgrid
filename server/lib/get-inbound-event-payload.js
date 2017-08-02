// @flow
import _ from "lodash";
import moment from "moment";

export default function getInboundEventPayload(message: Object) {
  let email;
  let createdAt;

  try {
    email = _.get(JSON.parse(message.envelope), "from");
  } catch (e) {
    email = null;
  }

  try {
    // implement trying to get date from headers
  } catch (e) {
    createdAt = moment.format("X");
  }

  const ident = { email };
  const eventName = "Inbound Email";
  const context = {
    source: "sendgrid",
    created_at: createdAt,
    event_type: "email",
    ip: message.sender_ip
  };
  const props = {
    email_subject: message.subject

  };

  return { ident, eventName, props, context };
}
