class RoleService {
	constructor(RoleModel) {
		this.RoleModel = RoleModel;
	}

	async getAllRoles() {
		return this.RoleModel.query();
	}

	async getRoleById(id) {
		return this.RoleModel.query().findById(id);
	}

	async createRole(roleData) {
		return this.RoleModel.query().insert(roleData);
	}

	async getRoleWithUsers(id) {
		return this.RoleModel.query().findById(id).withGraphFetched('users'); // Загружаем связанных пользователей
	}
}
module.exports = RoleService;
