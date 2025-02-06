function routeSeries(fastify, opts) {
	fastify.get(
		'/',
		{
			schema: {
				response: {
					200: {
						type: 'array',
						items: { $ref: 'SeriesWithEpisodes#' },
					},
				},
			},
		},
		async (req, reply) => {
			const series = await fastify.seriesService.getAllSeries();
			return series;
		}
	);
	fastify.get(
		'/:id',
		{
			schema: {
				params: {
					type: 'object',
					properties: {
						id: {
							type: 'number',
						},
					},
					required: ['id'],
				},
			},
		},
		async (req, reply) => {
			const { id } = req.params;
			const series = await fastify.seriesService.getSeriesById(id);
			return series;
		}
	);
}
module.exports = { routeSeries };
