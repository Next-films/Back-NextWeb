const crypto = require('crypto');

class PasswordService {
	/**
	 * @returns {string}
	 */
	generateSalt() {
		return crypto.randomBytes(16).toString('hex');
	}

	/**
	 * @param {string} password
	 * @param {string} salt
	 * @returns {Promise<string>}
	 */
	async hashPassword(password, salt) {
		return new Promise((resolve, reject) => {
			crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
				if (err) {
					reject(err);
				} else {
					resolve(derivedKey.toString('hex'));
				}
			});
		});
	}

	/**
	 * @param {string} password
	 * @param {string} hashedPassword
	 * @param {string} salt
	 * @returns {Promise<boolean>}
	 */
	async verifyPassword(password, hashedPassword, salt) {
		const newHash = await this.hashPassword(password, salt);
		return newHash === hashedPassword;
	}
}

module.exports = PasswordService;
