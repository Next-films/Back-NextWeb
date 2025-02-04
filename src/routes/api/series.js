export default function (fastify, opts) {
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
}
