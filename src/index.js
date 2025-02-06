const Fastify = require('fastify');
const { rootRoute } = require('./routes/index');
const dbPlugin = require('./plugins/database');
const { passwordServicePlugin } = require('./plugins/password');
const swagger = require('./plugins/swagger');
const { envToLogger } = require('./config/logger');

const { PORT: port, NODE_ENV: mode } = process.env;

const fastify = Fastify({
	logger: envToLogger[mode],
	https: false,
});

fastify.register(swagger, { port });
fastify.register(dbPlugin);
fastify.register(passwordServicePlugin);
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
