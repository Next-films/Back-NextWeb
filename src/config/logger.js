const envToLogger = {
	development: {
		transport: {
			target: 'pino-pretty',
			options: {
				colorize: true,
				translateTime: 'HH:MM:ss Z',
				ignore: 'pid,hostname',
				sync: false,
			},
		},
	},
	production: true,
	test: false,
};
module.exports = { envToLogger };
