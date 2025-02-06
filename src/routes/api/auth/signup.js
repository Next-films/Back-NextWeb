function routeSignUp(fastify) {
	fastify.get('/', async (req, reply) => {
		return { hello: 'from fastify signup' };
	});
}
module.exports = { routeSignUp };
