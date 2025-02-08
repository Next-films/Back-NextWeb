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
	async findOneByEmail(email) {
		return this.UserModel.query().findOne({ email });
	}

	async createUser(userData) {
		return this.UserModel.query().insert(userData);
	}
}
module.exports = UserService;
