// @flow
import _ from "lodash";
import { Request, Response } from "express";

import getEventPayload from "../lib/get-event-payload";
import getInboundEventPayload from "../lib/get-inbound-event-payload";

/**
 * @param  {Request} req
 * @param  {Response} res
 */
export default function webhookHandler(req: Request, res: Response) {
  if (_.isObject(req.body) && req.body.from) {
    // we are dealing with inbound parse webhook
    const { ident, eventName, props, context } = getInboundEventPayload(req.body);
    req.hull.client.logger.debug("incoming.event.start", req.body);

    const asUser = req.hull.client.asUser(ident);
    return asUser.track(eventName, props, context).then(
      () => asUser.logger.info("incoming.event.success", { eventName, props, context }),
      (error) => asUser.logger.error("incoming.event.error", { eventName, props, context, errors: error })
    );
  }

  if (!_.isArray(req.body)) {
    req.hull.client.logger.error("incoming.webhook.error", { message: "expected array in the body" });
    res.end("error");
  }

  _.map(req.body, (message) => {
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
    ).then(() => {
      if (message.event === "bounce") {
        if (message.type === "blocked") {
          return asUser.traits({ email_blocked_at: message.timestamp }, { source: "sendgrid" });
        }
        return asUser.traits({ email_bounced_at: message.timestamp }, { source: "sendgrid" });
      }
      return true;
    });
  });

  return res.end("ok");
}
