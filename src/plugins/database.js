const fp = require('fastify-plugin');
const knex = require('../db');
const User = require('../models/User');
const UserService = require('../services/userService');
const AuthService = require('../services/authService');
const MoviesService = require('../services/movies/moviesService');
const SeriesService = require('../services/series/seriesService');
const Movie = require('../models/Movie');
const Series = require('../models/Series');
const { raw } = require('objection');
const { RefreshToken } = require('../models/RefreshToken');

async function dbPlugin(fastify, options) {
	fastify.decorate('knex', knex);
	fastify.decorate('userService', new UserService(User));
	fastify.decorate('refreshTokenService', new AuthService(RefreshToken));
	fastify.decorate('movieService', new MoviesService(Movie, raw));
	fastify.decorate('seriesService', new SeriesService(Series, raw));
	fastify.addHook('onClose', async (instance) => {
		await instance.knex.destroy();
	});
}

module.exports = fp(dbPlugin);
