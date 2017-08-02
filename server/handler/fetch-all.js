// @flow
import _ from "lodash";
import { Request, Response } from "express";
import Promise from "bluebird";

/**
 * @param  {Request} req
 * @param  {Response} res
 */
export default function fetchAll(req: Request, res: Response) {
  let page = 1;
  const pageSize = parseInt(process.env.FETCH_ALL_PAGE_SIZE, 10) || 3;
  const { syncAgent } = req.hull.service;

  function fetch() {
    return syncAgent.fetchRecipients({ page, pageSize })
      .then((recipients) => {
        if (recipients && recipients.length > 0) {
          _.map(recipients, (recipient) => {
            return syncAgent.saveRecipient(recipient);
          });
          page += 1;
          return fetch();
        }
        return Promise.resolve();
      });
  }

  fetch();

  res.end("ok");
}
