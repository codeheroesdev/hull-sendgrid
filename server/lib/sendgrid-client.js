// @flow
import Hull from "hull";
import _ from "lodash";
import Promise from "bluebird";
import superagent from "superagent";
import superagentPrefixPlugin from "superagent-prefix";
import superagentPromisePlugin from "superagent-promise-plugin";

class FilteredError extends Error {
  req: Object;
  body: Object;
  statusCode: Number;
}

/**
 * Low level API access client
 */
export default class SendgridClient {
  apiUrl: string;
  apiKey: string;
  client: Hull;
  metric: Object;
  bottleneck: Object;

  constructor(ctx: Object, bottleneck: Object) {
    this.apiUrl = process.env.OVERRIDE_SENDGRID_URL || "https://api.sendgrid.com/v3";
    this.apiKey = _.get(ctx.ship, "private_settings.api_key");
    this.client = ctx.client;
    this.metric = ctx.metric;
    this.bottleneck = bottleneck;
  }

  isConfigured() {
    return _.isString(this.apiKey) && this.apiKey.length > 0;
  }

  /**
   * @return {superagent}
   */
  request(method: string, url: string) {
    return superagent[method](url)
    .use(superagentPrefixPlugin(this.apiUrl))
    .use(superagentPromisePlugin)
    .on("request", (reqData) => {
      this.client.logger.debug("connector.api.request", { method: reqData.method, url: reqData.url });
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
    .set("Authorization", `Bearer ${this.apiKey}`)
    .set("Content-Type", "application/json");
  }

  post(url: string, body: Object) {
    return this.bottleneck.schedule(() => {
      return this.request("post", url).send(body)
        .catch(err => this.handleError(err));
    });
  }

  delete(url: string, body: Object = {}) {
    return this.bottleneck.schedule(() => {
      return this.request("delete", url).send(body)
        .catch(err => this.handleError(err));
    });
  }

  get(url: string, query: Object = {}) {
    return this.bottleneck.schedule(() => {
      return this.request("get", url).query(query)
        .catch(err => this.handleError(err));
    });
  }

  handleError(err: Object) {
    const filteredError = new FilteredError(err.message);
    filteredError.stack = err.stack;
    filteredError.req = {
      url: _.get(err, "response.request.url"),
      method: _.get(err, "response.request.method"),
      data: _.get(err, "response.request._data")
    };
    filteredError.body = _.get(err, "response.body");
    filteredError.statusCode = _.get(err, "response.statusCode");

    return Promise.reject(filteredError);
  }
}

// X-RateLimit-Limit: 500
// X-RateLimit-Remaining: 499
// X-RateLimit-Reset: 1392815263
