import SyncAgent from "./sync-agent";
import { Cluster } from "bottleneck";

export default function factoryServiceMiddleware(bottleneckCluster: Cluster) {
  /**
   * serviceMiddleware injects custom classes to req.hull context object
   * @param  {Request}  req
   * @param  {Response} res
   * @param  {Function} next
   */
  return function serviceMiddleware(req, res, next) {
    if (!req.hull || !req.hull.ship) {
      return next();
    }
    const bottleneck = bottleneckCluster.key(req.hull.ship.id);
    const syncAgent = new SyncAgent(req.hull, bottleneck);

    req.hull.service = {
      syncAgent
    };

    return next();
  };
}
