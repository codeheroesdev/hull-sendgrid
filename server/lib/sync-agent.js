import { Client } from "hull";
import SendgridClient from "./sendgrid-client";
import SegmentMapper from "./segment-mapper";
import TraitMapper from "./trait-mapper";

/**
 * SyncAgent performs logic
 */
export default class SyncAgent {
  sendgridClient: SendgridClient;
  segmentMapper: SegmentMapper;
  client: Client;

  synchronizedSegments: Array;
  synchronizedTraits: Array;

  constructor(ctx: Object) {
    this.sendgridClient = new SendgridClient(ctx);
    this.client = ctx.client;

    this.segmentMapper = new SegmentMapper(ctx, this.sendgridClient);
    this.traitMapper = new TraitMapper(ctx, this.sendgridClient);

    this.synchronizedSegments = ctx.ship.private_settings.synchronized_segments;
    this.synchronizedTraits = ctx.ship.private_settings.synchronized_attributes;
  }

  /**
   * Is connector configured and able to run it's operations?
   * @return {Boolean}
   */
  isConfigured() {
    return this.sendgridClient.isConfigured();
  }

  /**
   * [sync description]
   * @return {[type]} [description]
   */
  sync() {
    return this.webhookSubscriber.subscribe()
      .then(() => this.segmentMapper.sync(this.synchronizedSegments))
      .then(() => this.traitMapper.sync(this.synchronized_attributes));
  }

  /**
   * @param  {Array<Object>} users
   * @return {Promise}
   */
  sendUsers(users: Array<Object>) {
  }

  saveUsers(users: Array<Object>) {

  }

  saveEvents(events: Array<Object>) {

  }
}
