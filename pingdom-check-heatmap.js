async function run(config, context, timeframe, fetcher) {
    try {
        /* Determine the context (Pingdom graph nodes) for the Pingdom data request */
        const nodes = await getGraphNodes(config, context, timeframe, fetcher);

        /* Get the Pingdom timeseries data for the Pingdom graph nodes */
        const data = await Promise.all(nodes.map(async node => {
            const pingdomConfig = { id: node.sourceId[0] };
            return fetcher('pingdom', pingdomConfig, node, timeframe);
        }));

        /* Transform the Pingdom timeseries data to that required by a Heatmap */
        return data.reduce((final, obj) => {
            const check = obj.series[0];
            const name = check.id.split(' Response Time ')[0];
            const props = check.data.reduce((row, datum) => {
                const options = timeframe.enum && timeframe.enum.includes('day') ?
                    { day: 'numeric', month: 'short' } :
                    { hour: 'numeric', minute: 'numeric'};
                const key = new Date(datum.timestamp).toLocaleString('en-GB', options);
                row[key] = datum.value;
                return row;
            }, {});
            final.push( { name, ...props } );
            return final;
        }, []);
    } catch (err) {
        console.error(err);
        throw err;
    }
}

async function getGraphNodes(config, context, timeframe, fetcher) {
    if (context.sourceId && context.sourceName) {
        if (context.sourceName[0] !== 'Pingdom') {
            throw new Error('Object is not a Pingdom check');
        }
        return [context];
    } else {
        const limit = (config.vars && config.vars.limit) || 10;
        const gremlinQuery = 'g.V().has("sourceName", sourceName).limit(limit).valueMap(true)';
        const bindings = { sourceName: 'Pingdom', limit };
        const graphConfig = { gremlinQuery, bindings };
        return fetcher('graph-custom', graphConfig, context, timeframe);
    }
}
