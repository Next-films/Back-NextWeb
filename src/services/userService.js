class UserService {
	constructor(UserModel) {
		this.UserModel = UserModel;
	}

	async getAllUsers() {
		return this.UserModel.query();
	}

	async getUserById(id) {
		return this.UserModel.query().findById(id);
	}

	async createUser(userData) {
		return this.UserModel.query().insert(userData);
	}

	async getUserWithRoles(id) {
		return this.UserModel.query().findById(id).withGraphFetched('roles'); // Загружаем связанные роли
	}
}
module.exports = UserService;
