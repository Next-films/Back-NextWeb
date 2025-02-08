class AuthService {
	constructor(refreshTokenModel) {
		this.refreshTokenModel = refreshTokenModel;
	}

	async createRefreshToken(payload) {
		const refreshToken = await this.refreshTokenModel.query().insert(payload);
		return refreshToken;
	}
}

module.exports = AuthService;
