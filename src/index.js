const Fastify = require('fastify');
const { rootRoute } = require('./routes/index');
const dbPlugin = require('./plugins/database');
const { hashServicePlugin } = require('./plugins/hash');
const swagger = require('./plugins/swagger');
const { envToLogger } = require('./config/logger');
const { default: fastifyJwt } = require('@fastify/jwt');
const { default: fastifyCors } = require('@fastify/cors');
// const { default: cookies } = require('@fastify/cookie');
const { PORT: port, NODE_ENV: mode } = process.env;

const fastify = Fastify({
	logger: envToLogger[mode],
	https: false,
});
fastify.register(fastifyCors, {
	origin: 'https://next-films.ru',
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Authorization', 'Content-Type', '*'],
	exposedHeaders: ['*'],
});
// fastify.register(cookies);
fastify.register(swagger, { port });
fastify.register(dbPlugin);
fastify.register(fastifyJwt, { secret: 'mySecretKey' });
fastify.register(hashServicePlugin);
fastify.register(rootRoute);

const start = async () => {
	try {
		await fastify.listen({ port: Number(port), host: '0.0.0.0' });
		fastify.log.info(`Сервер запущен на http://localhost:${port}`);
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();
