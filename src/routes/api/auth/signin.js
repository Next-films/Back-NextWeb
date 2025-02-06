function routeSignIn(fastify) {
	fastify.get('/', async (req, reply) => {
		return { hello: 'from fastify signin' };
	});
}

module.exports = { routeSignIn };
