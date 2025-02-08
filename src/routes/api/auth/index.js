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
			const salt = fastify.passwordService.generateSalt();
			const hashedPassowrd = await fastify.passwordService.hashPassword(
				password,
				salt
			);
			const result = await fastify.userService.createUser({
				email,
				password: hashedPassowrd,
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
		},
		async (req, reply) => {
			const { email, password } = req.body;
			const user = await fastify.userService.findOneByEmail(email);
			if (!user) {
				return reply.status(400).send({ message: 'Invalid login or password' });
			}
			const isPasswordValid = await fastify.passwordService.verifyPassword(
				password,
				user.password,
				user.salt
			);
			if (!isPasswordValid) {
				return reply.status(400).send({ message: 'Invalid login or password' });
			}
			const token = fastify.jwt.sign({ email });
			reply.send({ token });
		}
	);
}
module.exports = { routeAuth };
