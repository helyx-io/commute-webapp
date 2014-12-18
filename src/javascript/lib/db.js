
var config = require('../conf/config');

module.exports = require('knex')({
	client: config.db.dialect,
	connection: {
		host     : config.db.host,
		user     : config.db.username,
		password : config.db.password,
		database : config.db.database
	},
	pool: {
		min: config.db.min,
		max: config.db.max
	}
});
