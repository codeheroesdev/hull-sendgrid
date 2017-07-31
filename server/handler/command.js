// @flow
import Context from "../interface/context";

export default function commandHandler(ctx: Context) {
  const { syncAgent } = ctx.service;
  return syncAgent.sync();
}
