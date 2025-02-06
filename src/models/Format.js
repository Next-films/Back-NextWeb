const Model = require('./index');

class Format extends Model {
	static get tableName() {
		return 'formats';
	}
	static get idColumn() {
		return 'id';
	}
}

module.exports = Format;
