const Model = require('./index');
const Episode = require('./Episode');
class Season extends Model {
	static get tableName() {
		return 'seasons';
	}
	static get idColumn() {
		return 'id';
	}
	static get relationMappings() {
		return {};
	}
}

module.exports = Season;
