const esbuild = require('esbuild');

const isProduction = process.env.NODE_ENV === 'production';

/** @type {import('esbuild').BuildOptions} */
const config = {
	entryPoints: ['./src/index.js'],
	bundle: true,
	outfile: 'bundle.js',
	platform: 'node',
	target: 'node22',
	format: 'cjs',
	minify: isProduction,
	sourcemap: !isProduction,
	external: [
		'pino-pretty',
		'fastify',
		'fastify-sqlite',
		'fastify-plugin',
		'@fastify/swagger',
		'@fastify/swagger-ui',
		'@fastify/jwt',
		'@fastify/auth',
		'@fastify/cors',
		'@fastify/cookie',
		'sqlite3',
		'knex',
		'objection',
	],
	loader: {
		'.node': 'file',
		'.sql': 'text',
		'.env': 'text',
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(
			process.env.NODE_ENV || 'development'
		),
		IS_ESM: JSON.stringify(false),
	},
};

async function runBuild() {
	try {
		if (isProduction) {
			const result = await esbuild.build(config);
			console.log('Build complete:', result);
		} else {
			const ctx = await esbuild.context(config);
			await ctx.watch();
			console.log('Watching for changes...');
		}
	} catch (error) {
		console.error('Build failed:', error);
		process.exit(1);
	}
}

if (require.main === module) {
	runBuild();
}

module.exports = config;
