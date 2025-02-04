export default function (fastify) {
	fastify.get('/', async () => {
		return { hello: 'from api/signout' };
	});
}
