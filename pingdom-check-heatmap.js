async function run(config, context, timeframe, fetcher) {
        let data;

        if (context.sourceId && context.sourceName) {
                const sourceName = context.sourceName[0];
                if (sourceName !== 'Pingdom') {
                        return 'Object is not a Pingdom check';
                }
                data = [context];
        } else {
                const limit = config.vars?.limit || 10;
                const gremlinQuery = 'g.V().has("sourceName", sourceName).limit(limit).valueMap(true)';
                const bindings = { sourceName: 'Pingdom', limit };
                const graphConfig = { gremlinQuery, bindings };
                data = await fetcher('graph-custom', graphConfig, context, timeframe);
        }

        return Promise.all(data.map(async ctx => {
                const pingdomConfig = {
                        id: ctx.sourceId[0]
                        //includeUpTime: true,
                        //resultProp: 'downtime'
                }
                return fetcher('pingdom', pingdomConfig, ctx, timeframe);
        }));
}
