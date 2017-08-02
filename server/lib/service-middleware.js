import SyncAgent from "./sync-agent";

export default function factoryServiceMiddleware(bottleneckCluster: Object) {
  /**
   * serviceMiddleware injects custom classes to req.hull context object
   * @param  {Request}  req
   * @param  {Response} res
   * @param  {Function} next
   */
  return function serviceMiddleware(req, res, next) {
    if (!req.hull) {
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
