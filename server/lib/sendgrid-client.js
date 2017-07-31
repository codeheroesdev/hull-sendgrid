// @flow
import _ from "lodash";
import superagent from "superagent";
import superagentPrefixPlugin from "superagent-prefix";
import superagentPromisePlugin from "superagent-promise-plugin";

/**
 * Low level API access client
 */
export default class SendgridClient {
  apiUrl: String;
  apiKey: String;
  client: Hull;

  constructor(ctx: Object) {
    this.apiUrl = process.env.OVERRIDE_SENDGRID_URL || "https://api.sendgrid.com/v3";
    this.apiKey = _.get(ctx.ship, "private_settings.api_key");
    this.client = ctx.client;
  }

  isConfigured() {
    return _.isString(this.apiKey) && this.apiKey.length > 0;
  }

  /**
   * @return {superagent}
   */
  request(method, url) {
    return superagent[method](url)
      .use(superagentPrefixPlugin(this.apiUrl))
      .use(superagentPromisePlugin)
      .on("request", (reqData) => {
        this.client.logger("connector.api.request", reqData.method, reqData.url);
      })
      .on("response", (res) => {
        const limit = _.get(res.header, "x-ratelimit-limit");
        const remaining = _.get(res.header, "x-ratelimit-remaining");
        // const remainingSeconds = moment(_.get(res.header, "x-ratelimit-reset"), "X")
        //   .diff(moment(), "seconds");
        // x-runtime
        this.metric.increment("ship.service_api.call", 1);
        if (remaining) {
          this.metric.value("ship.service_api.remaining", remaining);
        }

        if (limit) {
          this.metric.value("ship.service_api.limit", limit);
        }
      })
      .set("Authorization", `Bearer ${this.apiKey}`);
  }
}

// X-RateLimit-Limit: 500
// X-RateLimit-Remaining: 499
// X-RateLimit-Reset: 1392815263
