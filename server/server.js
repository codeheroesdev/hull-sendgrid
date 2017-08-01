import express from "express";
import { notifHandler } from "hull/lib/utils";

import { userHandler, webhookHandler, adminHandler, commandHandler } from "./handler";

export default function server(app: express) {
  app.use("/notify", notifHandler({
    handlers: {
      "ship:update": commandHandler,
      "segment:update": commandHandler,
      "segment:delete": commandHandler,
      "user:update": userHandler
    }
  }));
  app.use("/batch", notifHandler({
    handlers: {
      "user:update": userHandler
    }
  }));

  app.all("/sync", (req, res) => {
    res.end("ok");
  });

  app.all("/webhook", webhookHandler);

  app.get("/admin", adminHandler);


  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "https://dashboard.hullbeta.io");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
    res.setHeader("Access-Control-Allow-Credentials", true);
    next();
  });

  app.use("/schema/custom_fields", (req, res) => {
    res.send({
      options: [
        { value: "sendgrid_id2", label: "sendgrid_id2" },
        { value: "email2", label: "email2" }
      ]
    });
  });

  return app;
}
