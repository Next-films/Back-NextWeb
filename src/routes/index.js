const { routeApi } = require('./api/index');

function rootRoute(fastify, opts) {
	
	fastify.get(
		'/',
		{
			schema: {
				tags: ['root'],
				description: 'Root endpoint',
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
		async function (request, reply) {
			return { hello: 'world from root' };
		}
	);
	fastify.register(routeApi, { prefix: '/api' });
}
module.exports = { rootRoute };
