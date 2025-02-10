const signUpBodySchema = {
	$id: 'SignUpBody',
	type: 'object',
	required: ['email', 'password', 'login'],
	properties: {
		email: {
			type: 'string',
			format: 'email',
		},
		password: {
			type: 'string',
			minLength: 8,
		},
		login: {
			type: 'string',
			minLength: 3,
		},
	},
};
const signUpResponseSchema = {
	$id: 'SignUpResponse',
	type: 'object',
	required: ['email', 'login', 'role'],
	properties: {
		email: {
			type: 'string',
			format: 'email',
		},
		login: {
			type: 'string',
		},
		role: {
			type: 'string',
		},
	},
};

const signInBodySchema = {
	$id: 'SignInBody',
	type: 'object',
	required: ['email', 'password'],
	properties: {
		email: {
			type: 'string',
			format: 'email',
		},
		password: {
			type: 'string',
		},
	},
};
const responseAuthMessage = {
	$id: 'ResponseAuthMessage',
	type: 'object',
	required: ['message'],
	properties: {
		message: {
			type: 'string',
		},
	},
};
module.exports = [
	signUpBodySchema,
	signUpResponseSchema,
	signInBodySchema,
	responseAuthMessage,
];
