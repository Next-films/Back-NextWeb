import routeFilms from './films';
import routeSeries from './series';
import routeUsers from './users';
import routeAuth from './auth/index';

export default function (fastify) {
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
	fastify.register(routeFilms, { prefix: '/films' });
	fastify.register(routeSeries, { prefix: '/series' });
	fastify.register(routeUsers, { prefix: '/users' });
}
