// const Model = require('./index');
// const User = require('./User');
// const UserRole = require('./UserRole');

// class Role extends Model {
// 	static get tableName() {
// 		return 'roles';
// 	}
// 	static get idColumn() {
// 		return 'id';
// 	}

// 	static get relationMappings() {
// 		return {
// 			users: {
// 				relation: Model.ManyToManyRelation,
// 				modelClass: User,
// 				join: {
// 					from: 'roles.id',
// 					through: {
// 						from: 'userRoles.roleId',
// 						to: 'userRoles.userId',
// 					},
// 					to: 'users.id',
// 				},
// 			},
// 			userRoles: {
// 				relation: Model.HasManyRelation,
// 				modelClass: UserRole,
// 				join: {
// 					from: 'roles.id',
// 					to: 'userRoles.userId',
// 				},
// 			},
// 		};
// 	}
// }
// module.exports = Role;
