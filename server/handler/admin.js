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

  if (syncAgent.isConfigured()) {
    const segmentsFromSendgrid = syncAgent.segmentMapper.getObjects().then(response => response.lists.filter(list =>
      _.includes(syncAgent.segmentMapper.getSyncedListIds(), list.id)
    ));

    return segmentsFromSendgrid.then(resultList => {
      res.render("segments.html", {
        segmentsFromSendgrid: resultList,
        _,
        hostname: req.hull.hostname,
        token: req.hull.token
      });
    })
    .catch(() => {
      res.render("not-configured.html");
    });
  }

  return res.render("not-configured.html");
}
