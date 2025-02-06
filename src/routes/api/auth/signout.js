function routeSignOut(fastify) {
	fastify.get('/', async () => {
		return { hello: 'from api/signout' };
	});
}
module.exports = { routeSignOut };
