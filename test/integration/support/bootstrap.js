const Connector = require("hull").Connector;
const express = require("express");

const server = require("../../../server/server").default;
const serviceMiddleware = require("../../../server/lib/service-middleware").default;

module.exports = function bootstrap(port) {
  const app = express();
  const connector = new Connector({ hostSecret: "1234", port, clientConfig: { protocol: "http", firehoseUrl: "firehose" } });
  connector.use(serviceMiddleware());
  connector.setupApp(app);
  server(app);

  return connector.startApp(app);
};
