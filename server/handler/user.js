// @flow

import Message from "../interface/message";
import Context from "../interface/context";

/**
 * This handler handles all user update messages
 * @param  {Context} ctx
 * @param  {Array<Message>} messages
 * @return {Promise}
 */
export default function userHandler(ctx: Context, messages: Array<Message>) {
  const { is_batch: isBatch } = ctx.options;
}
