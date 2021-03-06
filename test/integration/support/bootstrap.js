const Connector = require("hull").Connector;
const express = require("express");
const Cluster = require("bottleneck").Cluster;

const server = require("../../../server/server").default;
const serviceMiddleware = require("../../../server/lib/service-middleware").default;

module.exports = function bootstrap(port) {
  const app = express();
  const connector = new Connector({ hostSecret: "1234", port, clientConfig: { protocol: "http", firehoseUrl: "firehose" } });
  const bottleneckCluster = new Cluster(2, 1000);
  connector.use(serviceMiddleware(bottleneckCluster));
  connector.setupApp(app);
  server(app);

  return connector.startApp(app);
};
