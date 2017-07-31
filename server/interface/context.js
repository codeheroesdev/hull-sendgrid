// @flow
export default class Context {
  config: Object;
  token: String;
  client: Object;

  service: Object;

  segments: Array<Object>;
  ship: Object;
  connector: Object;

  hostname: String;
  options: Object;
  connectorConfig: Object;

  metric: Function;
  helpers: Object;
  notification: Object;
}
