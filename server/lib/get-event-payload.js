// @flow
import _ from "lodash";

const eventNameMapping = {
  delivered: "Email Delivered",
  open: "Email Opened",
  click: "Email Link Clicked",
  bounce: "Email Bounced",
  spamreport: "Email Marked as Spam",
  unsubscribe: "Unsubscribed"
};


export default function getEventPayload(message: Object) {
  const ident = { email: message.email };
  const eventName = _.get(eventNameMapping, message.event);
  const context = {
    source: "sendgrid",
    event_id: message.sg_event_id,
    created_at: message.timestamp,
    event_type: "email",
    ip: message.ip,
    user_agent: message.useragent
  };
  const props = {
    campaign_name: message.category
  };

  return { ident, eventName, props, context };
}
