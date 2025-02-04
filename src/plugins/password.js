const PasswordService = require('../services/passwordService');

async function passwordServicePlugin(fastify, options) {
	fastify.decorate('passwordService', PasswordService);
}

module.exports = passwordServicePlugin;
