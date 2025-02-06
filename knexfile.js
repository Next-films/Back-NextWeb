const { resolve } = require('path');

module.exports = {
	development: {
		client: 'sqlite3',

		connection: {
			filename: resolve(__dirname, 'db/nextfilms.db'),
			timezone: 'UTC',
		},
		useNullAsDefault: true,
		migrations: {
			directory: resolve(__dirname, 'db/migrations'),
		},
		seeds: {
			directory: resolve(__dirname, 'db/seeds'),
		},
	},
	production: {
		client: 'sqlite3',

		connection: {
			filename: resolve(__dirname, 'db/nextfilms.db'),
			timezone: 'UTC',
		},
		useNullAsDefault: true,
		migrations: {
			directory: resolve(__dirname, 'db/migrations'),
		},
		seeds: {
			directory: resolve(__dirname, 'db/seeds'),
		},
	},
};
