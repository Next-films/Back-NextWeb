export default function (fastify, opts) {
	fastify.get('/', async (req, reply) => {
		const users = await fastify.userService.getAllUsers();
		return users;
	});
}
