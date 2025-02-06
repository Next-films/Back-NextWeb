const { Model } = require('objection');
const { connection } = require('../db');

Model.knex(connection);

module.exports = Model;
