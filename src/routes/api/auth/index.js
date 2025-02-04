import routeSignup from './signup';
import routeSignin from './signin';
import routeSignout from './signout';

export default function (fastify) {
	fastify.get('/', async (req, reply) => {
		return { hello: 'world from api/auth' };
	});

	fastify.register(routeSignup, { prefix: '/signup' });
	fastify.register(routeSignin, { prefix: '/signin' });
	fastify.register(routeSignout, { prefix: '/signout' });
}
