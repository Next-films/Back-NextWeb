// const Model = require('./index');
// const User = require('./User');
// const Role = require('./Role');

// class UserRole extends Model {
// 	static get tableName() {
// 		return 'userRoles';
// 	}
// 	static get idColumn() {
// 		return 'id';
// 	}
// 	static get relationMappings() {
// 		return {
// 			user: {
// 				relation: Model.BelongsToOneRelation,
// 				modelClass: User,
// 				join: {
// 					from: 'userRoles.id',
// 					to: 'user.id',
// 				},
// 			},
// 			role: {
// 				relation: Model.BelongsToOneRelation,
// 				modelClass: Role,
// 				join: {
// 					from: 'userRoles.id',
// 					to: 'role.id',
// 				},
// 			},
// 		};
// 	}
// }

// module.exports = UserRole;
