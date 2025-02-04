const { Model } = require('objection');
const knex = require('../db');

Model.knex(knex);

module.exports = Model;
