import express from "express";
import Hull from "hull";
import { Cluster } from "bottleneck";

import server from "./server";
import serviceMiddleware from "./lib/service-middleware";

if (process.env.LOG_LEVEL) {
  Hull.logger.transports.console.level = process.env.LOG_LEVEL;
}

const app = express();
const connector = new Hull.Connector({
  hostSecret: process.env.SECRET || "1234",
  port: process.env.PORT || 8082,
});
const bottleneckCluster = new Cluster(1, 2000);

connector.use(serviceMiddleware(bottleneckCluster));
connector.setupApp(app);
server(app);
connector.startApp(app);
