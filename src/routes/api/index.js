const { routeMovies } = require('./movies');
const { routeSeries } = require('./series');
const { routeUsers } = require('./users');
const { routeAuth } = require('./auth/index');

function routeApi(fastify) {
	fastify.get(
		'/',
		{
			schema: {
				tags: ['api'],
				description: 'API root endpoint',
				response: {
					200: {
						type: 'object',
						properties: {
							hello: { type: 'string' },
						},
					},
				},
			},
		},
		async (req, reply) => {
			return { hello: 'world from api' };
		}
	);
	fastify.register(routeAuth, { prefix: '/auth' });
	fastify.register(routeMovies, { prefix: '/movies' });
	fastify.register(routeSeries, { prefix: '/series' });
	fastify.register(routeUsers, { prefix: '/users' });
}
module.exports = { routeApi };
