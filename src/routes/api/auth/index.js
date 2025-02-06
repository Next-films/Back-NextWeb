const { routeSignUp } = require('./signup');
const { routeSignIn } = require('./signin');
const { routeSignOut } = require('./signout');

function routeAuth(fastify) {
	fastify.get('/', async (req, reply) => {
		return { hello: 'world from api/auth' };
	});

	fastify.register(routeSignUp, { prefix: '/signup' });
	fastify.register(routeSignIn, { prefix: '/signin' });
	fastify.register(routeSignOut, { prefix: '/signout' });
}
module.exports = { routeAuth };
