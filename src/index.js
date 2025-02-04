import Fastify from 'fastify';
import routes from './routes/index';
import dbPlugin from './plugins/database';
import passwordServicePlugin from './plugins/password';
import swagger from './plugins/swagger';
import { envToLogger } from './config/logger';

const { PORT: port, NODE_ENV: mode } = process.env;

const fastify = Fastify({
	logger: envToLogger[mode],
	https: false,
});

fastify.register(swagger, { port });
fastify.register(dbPlugin);
fastify.register(passwordServicePlugin);
fastify.register(routes);

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
