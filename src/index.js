const Fastify = require('fastify');
const { rootRoute } = require('./routes/index');
const dbPlugin = require('./plugins/database');
const { hashServicePlugin } = require('./plugins/hash');
const swagger = require('./plugins/swagger');
const { envToLogger } = require('./config/logger');
// const { default: fastifyJwt } = require('@fastify/jwt');
const fastifyCors = require('@fastify/cors');
const fastifyCookie = require('@fastify/cookie');
const fastifySession = require('@fastify/session');
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

fastify.register(swagger, { port });
fastify.register(dbPlugin);
fastify.register(fastifyCookie);
fastify.register(fastifySession, {
	secret: 'a-very-secret-key-for-signing-the-session-id-cookie',
	cookie: {
		secure: mode === 'production',
		httpOnly: true,
		maxAge: 1000 * 60 * 60 * 24,
	},
	proxy: mode === 'production',
});
fastify.register(hashServicePlugin);
fastify.addHook('onRequest', async (request, reply) => {
	if (request.session.user) {
		request.session.cookie.expires = new Date(Date.now() + 604_800_800); // week
	}
});
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
