// @flow
import _ from "lodash";
import { Request, Response } from "express";

/**
 * @param  {Request} req
 * @param  {Response} res
 */
export default function fetchAll(req: Request, res: Response) {
  let page = 1;
  const pageSize = parseInt(process.env.FETCH_ALL_PAGE_SIZE, 10) || 3;
  const { syncAgent } = req.hull.service;

  function fetch() {
    syncAgent.fetchRecipients({ page, pageSize })
      .then((recipients) => {
        if (recipients.length > 0) {
          _.map(recipients, (recipient) => {
            return syncAgent.saveRecipient(recipient);
          });
        }

        if (recipients.length > 0) {
          page += 1;
          setTimeout(() => {
            return fetch();
          }, 1000);
        }
      });
  }

  fetch();

  res.end("ok");
}
