const crypto = require('crypto');

class HashService {
	/**
	 * @returns {string}
	 */
	generateSalt() {
		return crypto.randomBytes(16).toString('hex');
	}

	/**
	 * @param {string} dataString
	 * @param {string} salt
	 * @returns {Promise<string>}
	 */
	async makeHash(dataString, salt) {
		return new Promise((resolve, reject) => {
			crypto.pbkdf2(
				dataString,
				salt,
				100000,
				64,
				'sha512',
				(err, derivedKey) => {
					if (err) {
						reject(err);
					} else {
						resolve(derivedKey.toString('hex'));
					}
				}
			);
		});
	}

	/**
	 * @param {string} dataString
	 * @param {string} hashedDataString
	 * @param {string} salt
	 * @returns {Promise<boolean>}
	 */
	async verifyHash(password, hashedPassword, salt) {
		const newHash = await this.makeHash(password, salt);
		return newHash === hashedPassword;
	}
}

module.exports = HashService;
