import express from "express";
import { notifHandler } from "hull/lib/utils";
import cors from "cors";
import _ from "lodash";
import multer from "multer";
const upload = multer();

import { userHandler, webhookHandler, adminHandler, commandHandler, fetchAllHandler } from "./handler";

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

  app.all("/webhook", upload.array(), webhookHandler);

  app.get("/admin", adminHandler);

  app.post("/fetch-all", fetchAllHandler);

  app.use("/schema/custom_fields", cors(), (req, res) => {
    res.send({
      options: _.get(req, "hull.ship.private_settings.traits_mapping", []).map(name => {
        return {
          label: name,
          value: name
        };
      })
    });
  });

  return app;
}
