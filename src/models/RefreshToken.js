const Model = require('./index');

class RefreshToken extends Model {
	static get tableName() {
		return 'refreshTokens';
	}

	static get idColumn() {
		return 'id';
	}

	// static get jsonSchema() {
	// 	return {
	// 		type: 'object',
	// 		required: ['userId', 'tokenHash', 'tokenSalt', 'expiresAt'],
	// 		properties: {
	// 			id: { type: 'integer' },
	// 			userId: { type: 'integer' },
	// 			tokenHash: { type: 'string' },
	// 			expiresAt: { type: 'string', format: 'date-time' },
	// 		},
	// 	};
	// }
	static get relationMappings() {
		return {
			user: {
				relation: Model.BelongsToOneRelation,
				modelClass: require('./User'),
				join: {
					from: 'refreshTokens.userId',
					to: 'users.id',
				},
			},
		};
	}
}

module.exports = { RefreshToken };
