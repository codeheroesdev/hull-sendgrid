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
  const isBatch = _.has(ctx.options, "format") && _.has(ctx.options, "url");
  const { syncAgent } = ctx.service;

  // TODO filtering
  console.log({ isBatch });
  // const users = messages.map(m => m.user);
  return syncAgent.sendNotifications(messages);
}
