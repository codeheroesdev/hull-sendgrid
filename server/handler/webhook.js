// @flow
import _ from "lodash";

import getEventPayload from "../lib/get-event-payload";
import getInboundEventPayload from "../lib/get-inbound-event-payload";

/**
 * @param  {Request} req
 * @param  {Response} res
 */
export default function webhookHandler(req, res) {

  if (_.isObject(req.body) && req.body.from) {
    // we are dealing with inbound parse webhook


  }

  if (!_.isArray(req.body)) {
    req.hull.client.logger.error("incoming.webhook.error", { message: "expected array in the body" });
    res.end("error");
  }

  const promises = _.map(req.body, (message) => {
    const { ident, eventName, props, context } = getEventPayload(message);
    req.hull.client.logger.debug("incoming.event.start", message);

    if (!ident.email) {
      return req.hull.client.logger.info("incoming.event.skip", { reason: "no email provided, cannot ident user" });
    }

    const asUser = req.hull.client.asUser(ident);

    if (!eventName) {
      return asUser.logger.info("incoming.event.skip", { reason: "event is not supported", event: message.event });
    }

    return asUser.track(eventName, props, context).then(
      () => asUser.logger.info("incoming.event.success", { eventName, props, context }),
      (error) => asUser.logger.error("incoming.event.error", { eventName, props, context, errors: error })
    );
  });

  res.end("ok");
}
