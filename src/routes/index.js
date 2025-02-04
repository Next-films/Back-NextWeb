import api from './api';

export default function (fastify, opts) {
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
	fastify.register(api, { prefix: '/api' });
}
