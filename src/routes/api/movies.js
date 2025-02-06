function routeMovies(fastify, opts) {
	fastify.get(
		'/',
		{
			schema: {
				querystring: {
					type: 'object',
					properties: {
						format: {
							type: 'string',
						},
					},
				},
				response: {
					200: {
						type: 'array',
						items: { $ref: 'Movie#' },
					},
				},
			},
		},
		async (req, reply) => {
			const { format } = req.query;

			if (format) {
				const movies = await fastify.movieService.getMoviesByFormat(format);
				return movies;
			}
			const movies = await fastify.movieService.getAllMovies();
			return movies;
		}
	);
	fastify.get(
		'/:id',
		{
			schema: {
				params: {
					type: 'object',
					properties: {
						id: { type: 'number' },
					},
					required: ['id'],
				},
			},
		},
		async (req, reply) => {
			const { id } = req.params;
			const movie = await fastify.movieService.getMovieById(id);
			return movie;
		}
	);
}
module.exports = { routeMovies };
