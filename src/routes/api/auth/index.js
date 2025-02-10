const {
	signUpBodySchema,
	signUpResponseSchema,
	signInBodySchema,
} = require('./../../../schemas/auth-schema');

function routeAuth(fastify) {
	fastify.get('/', async (req, reply) => {
		return { hello: 'world from api/auth' };
	});
	fastify.post(
		'/signup',
		{
			body: signUpBodySchema,
			response: {
				201: signUpResponseSchema,
			},
		},
		async (req, reply) => {
			const { email, password, login } = req.body;
			const user = await fastify.userService.findOneByEmail(email);
			if (user) {
				reply.status(400).send({ message: 'Email already exists' });
			}
			const salt = fastify.hashService.generateSalt();
			const hashedPassword = await fastify.hashService.makeHash(password, salt);
			const result = await fastify.userService.createUser({
				email,
				password: hashedPassword,
				salt,
				login,
				role: 'user',
			});
			reply.code(201);
			return {
				email: result.email,
				login: result.login,
				role: result.role,
			};
		}
	);
	fastify.post(
		'/signin',
		{
			body: signInBodySchema,
			response: {
				201: {
					type: 'object',
					properties: {
						message: {
							type: 'string',
						},
					},
				},
			},
		},
		async (req, reply) => {
			const { email, password } = req.body;
			const user = await fastify.userService.findOneByEmail(email);
			if (!user) {
				return reply.status(400).send({ message: 'Invalid login or password' });
			}
			const isPasswordValid = await fastify.hashService.verifyHash(
				password,
				user.password,
				user.salt
			);
			if (!isPasswordValid) {
				return reply.status(400).send({ message: 'Invalid login or password' });
			}

			req.session.user = {
				userId: user.userId,
				login: user.login,
				role: user.role,
			};

			reply.code(201).send({ message: 'success' });
		}
	);
	fastify.post(
		'/signout',
		{
			response: {
				200: {
					type: 'object',
					properties: {
						message: 'string',
					},
				},
			},
		},
		async (req, reply) => {
			req.session.destroy();
			return { message: 'Logged out successfully' };
		}
	);
}
module.exports = { routeAuth };
