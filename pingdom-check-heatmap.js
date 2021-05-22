async function run(config, context, timeframe, fetcher) {
    let data;

    if (context.sourceId && context.sourceName) {
        const sourceName = context.sourceName[0];
        if (sourceName !== 'Pingdom') {
                return 'Object is not a Pingdom check';
        }
        data = [context];
    } else {
        const limit = (config.vars && config.vars.limit) || 10;
        const gremlinQuery = 'g.V().has("sourceName", sourceName).limit(limit).valueMap(true)';
        const bindings = { sourceName: 'Pingdom', limit };
        const graphConfig = { gremlinQuery, bindings };
        data = await fetcher('graph-custom', graphConfig, context, timeframe);
    }

    data = await Promise.all(data.map(async ctx => {
        const pingdomConfig = {
                id: ctx.sourceId[0]
        }
        return fetcher('pingdom', pingdomConfig, ctx, timeframe);
    }));

    return data.reduce((final, obj) => {
        const check = obj.series[0];
        const name = check.id.split(' Response Time ')[0];
        const props = check.data.reduce((row, datum) => {
            const options = { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric' };
            const key = new Date(datum.timestamp).toLocaleString('en-GB', options);
            row[key] = datum.value;
            return row;
        }, {});
        final.push( { name, ...props } );
        return final;
    }, []);
}