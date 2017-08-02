// @flow
import _ from "lodash";
import Message from "../interface/message";
import Context from "../interface/context";

/**
 * This handler handles all user update messages
 * @param  {Context} ctx
 * @param  {Array<Message>} messages
 * @return {Promise}
 */
export default function userHandler(ctx: Context, messages: Array<Message>) {
  const { syncAgent } = ctx.service;

  messages = messages.filter((message) => {
    if (_.get(message, "changes.user['traits_sendgrid/id'][1]")) {
      ctx.client.logger.info("outgoing.user.skip", { reason: "user was just updated by the connector, avoiding loop" });
      return false;
    }
    return true;
  });

  return syncAgent.sync()
    .then(() => syncAgent.sendNotifications(messages));
}
