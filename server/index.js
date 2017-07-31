import express from "express";
import Hull from "hull";

import server from "./server";
import serviceMiddleware from "./lib/service-middleware";

const app = express();
const connector = new Hull.Connector({
  hostSecret: process.env.SECRET || "1234",
  port: process.env.PORT || 8082,
});

connector.use(serviceMiddleware());
connector.setupApp(app);
server(app);
connector.startApp(app);
