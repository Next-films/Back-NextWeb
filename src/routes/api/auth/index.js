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
			const jwtPayload = {
				userId: user.id,
				login: user.login,
				role: user.role,
			};
			const accessToken = fastify.jwt.sign(
				{ ...jwtPayload, type: 'access' },
				{ expiresIn: '15m' }
			);
			const refreshToken = fastify.jwt.sign(
				{ ...jwtPayload, type: 'refresh' },
				{ expiresIn: '7d' }
			);
			// reply.setCookie('accessToken', accessToken, {
			// 	httpOnly: true,
			// 	secure: true,
			// 	sameSite: 'strict',
			// 	path: '/',
			// 	maxAge: 3600,
			// });
			// reply.setCookie('refreshToken', refreshToken, {
			// 	httpOnly: true,
			// 	secure: true,
			// 	sameSite: 'strict',
			// 	path: '/',
			// 	maxAge: 605000,
			// });
			reply.send({ accessToken, refreshToken, message: 'Success' });
		}
	);
	fastify.post('/refresh', async (req, reply) => {
		const { refreshToken } = req.body;
		if (!refreshToken) {
			return reply.status(400).send({ error: 'Missing refresh token' });
		}
		try {
			const payload = fastify.jwt.verify(refreshToken);
			if (payload.type !== 'refresh') {
				return reply.status(400).send({ error: 'Invalid token' });
			}
			const accessToken = fastify.jwt.sign(
				{ ...payload, type: 'access' },
				{ expiresIn: '15m' }
			);
			const refreshToken = fastify.jwt.sign(payload, { expiresIn: '7d' });
			reply.send({ accessToken, refreshToken });
		} catch (err) {
			reply.status(401).send({ error: 'Invalid or expired refresh token' });
		}
	});
}
module.exports = { routeAuth };
