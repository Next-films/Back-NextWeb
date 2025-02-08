const fastifyPlugin = require('fastify-plugin');
const HashService = require('../services/hashService');

const hashServicePlugin = fastifyPlugin(async function passwordServicePlugin(
	fastify
) {
	fastify.decorate('hashService', new HashService());
});
module.exports = { hashServicePlugin };
