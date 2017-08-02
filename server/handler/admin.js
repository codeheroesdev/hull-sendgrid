// @flow
import _ from "lodash";
import { Request, Response } from "express";

/**
 * Handler responsible for service Admin dashboard
 * @param  {Request} req
 * @param  {Response} res
 */
export default function adminHandler(req: Request, res: Response) {
  const { syncAgent } = req.hull.service;
  console.log(req.hull.token);
  if (syncAgent.isConfigured()) {
    return res.render("segments.html", {
      lists: [{ id: 1, name: "test", recipient_count: 100 }],
      segments: req.hull.segments,
      synchronizedSegments: [],
      _
    });
  }

  return res.render("not-configured.html");
}
