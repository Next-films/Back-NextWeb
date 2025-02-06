const fastifyPlugin = require('fastify-plugin');
const PasswordService = require('../services/passwordService');

const passwordServicePlugin = fastifyPlugin(
	async function passwordServicePlugin(fastify, options) {
		fastify.decorate('passwordService', PasswordService);
	}
);
module.exports = { passwordServicePlugin };
