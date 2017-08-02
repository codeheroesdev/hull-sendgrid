// @flow
import _ from "lodash";

/**
 * Handler responsible for service Admin dashboard
 * @param  {Request} req
 * @param  {Response} res
 */
export default function adminHandler(req, res) {
  const { syncAgent } = req.hull.service;
  console.log(req.hull.token);
  if (syncAgent.isConfigured()) {
    const segmentsFromSendgrid = syncAgent.segmentMapper.getObjects().then(response => response.lists.filter(list =>
      _.includes(syncAgent.segmentMapper.getSyncedListIds(), list.id)
    ));

    return segmentsFromSendgrid.then(resultList => {
      res.render("segments.html", {
        segmentsFromSendgrid: resultList,
        segments: req.hull.segments,
        synchronizedSegments: resultList,
        _
      });
    });
  }

  return res.render("not-configured.html");
}
