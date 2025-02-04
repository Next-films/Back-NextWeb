const Model = require('./index');
const UserRole = require('./UserRole');
const Role = require('./Role');

class User extends Model {
	static get tableName() {
		return 'users';
	}
	static get idColumn() {
		return 'id';
	}
	static get relationMappings() {
		return {
			roles: {
				relation: Model.ManyToManyRelation,
				modelClass: Role,
				join: {
					from: 'users.id',
					through: {
						from: 'userRoles.userId',
						to: 'userRoles.roleId',
					},
					to: 'roles.id',
				},
			},
			userRoles: {
				relation: Model.HasManyRelation,
				modelClass: UserRole,
				join: {
					from: 'users.id',
					to: 'userRoles.userId',
				},
			},
		};
	}
}

module.exports = User;
