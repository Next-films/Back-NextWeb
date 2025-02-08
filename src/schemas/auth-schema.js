const signUpBodySchema = {
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
module.exports = { signUpBodySchema, signUpResponseSchema, signInBodySchema };
