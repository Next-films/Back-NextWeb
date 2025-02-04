export default function (fastify) {
	fastify.get('/', async (req, reply) => {
		return { hello: 'from fastify signin' };
	});
}
