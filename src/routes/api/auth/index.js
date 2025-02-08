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
			const accessToken = fastify.jwt.sign(
				{ userId: user.id },
				{ expiresIn: '15m' }
			);
			const refreshToken = fastify.jwt.sign(
				{ userId: user.id },
				{ expiresIn: '7d' }
			);

			const refreshTokenExpiresAt = fastify.jwt.decode(refreshToken).exp;
			const refreshTokenSalt = fastify.hashService.generateSalt();
			const refreshTokenHash = await fastify.hashService.makeHash(
				refreshToken,
				refreshTokenSalt
			);

			await fastify.refreshTokenService.createRefreshToken({
				tokenHash: refreshTokenHash,
				tokenSalt: refreshTokenSalt,
				expiresAt: refreshTokenExpiresAt,
				userId: user.id,
			});
			reply.send({ accessToken, refreshToken });
		}
	);
}
module.exports = { routeAuth };
