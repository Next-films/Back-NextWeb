const { fastifySwagger } = require('@fastify/swagger');
const { fastifySwaggerUi } = require('@fastify/swagger-ui');
const fastifyPlugin = require('fastify-plugin');
const { movieSchema } = require('../schemas/movie-schema');
const {
	seriesSchema,
	seriesWithEpisodesSchema,
} = require('../schemas/series-schema');

async function swaggerKit(fastify, { port }) {
	fastify.addSchema({
		$id: 'Movie',
		...movieSchema,
	});
	fastify.addSchema({
		$id: 'Series',
		...seriesSchema,
	});
	fastify.addSchema({
		$id: 'SeriesWithEpisodes',
		...seriesWithEpisodesSchema,
	});
	fastify.register(fastifySwagger, {
		openapi: {
			openapi: '3.0.0',
			info: {
				title: 'NextFilms swagger API',
				description: 'NextFilms Fastify swagger API',
				version: '0.1.0',
			},
			servers: [
				{
					url: `http://localhost:${port}`,
					description: 'Development server',
				},
			],
			components: {
				schemas: {
					Movie: 'Movie#',
					Series: 'Series#',
					SeriesWithEpisodes: 'SeriesWithEpisodes#',
				},
			},
		},
		exposeRoute: true,
	});

	fastify.register(fastifySwaggerUi, {
		routePrefix: '/documentation',
		uiConfig: {
			docExpansion: 'full',
			deepLinking: true,
			defaultModelsExpandDepth: 3,
			defaultModelExpandDepth: 3,
			displayOperationId: true,
		},
		uiHooks: {
			onRequest: function (request, reply, next) {
				next();
			},
			preHandler: function (request, reply, next) {
				next();
			},
			onSend: (request, reply, payload, done) => {
				reply.header(
					'Content-Security-Policy',
					"style-src 'self' 'unsafe-inline'"
				);
				done();
			},
		},
		staticCSP: false,
		transformStaticCSP: (header) => header,
		transformSpecification: (swaggerObject, request, reply) => {
			return swaggerObject;
		},
		transformSpecificationClone: true,
	});
}
module.exports = fastifyPlugin(swaggerKit);
