function routeUsers(fastify, opts) {
	fastify.get('/', async (req, reply) => {
		const users = await fastify.userService.getAllUsers();
		return users;
	});
}
module.exports = { routeUsers };
