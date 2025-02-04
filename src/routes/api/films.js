// /routes/api/films.js
export default function (fastify, opts) {
	fastify.get(
		'/',
		{
			schema: {
				response: {
					200: {
						type: 'array',
						items: { $ref: 'Movie#' },
					},
				},
			},
		},
		async (req, reply) => {
			const movies = await fastify.movieService.getAllMovies();
			return movies;
		}
	);
}
