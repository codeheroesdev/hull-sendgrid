import express from "express";
import { notifHandler } from "hull/lib/utils";

import { userHandler, webhookHandler, adminHandler } from "./handler";

export default function server(app: express) {
  app.use("/notify", notifHandler({
    handlers: {
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

  return app;
}
