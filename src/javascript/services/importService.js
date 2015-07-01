////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var csv = require('fast-csv');
var uuid = require('uuid');
var fs = require('fs');
var Promise = require('bluebird');

var config = require('../conf/config');

var logger = require('../lib/logger');
var DB = require('../lib/db');
var db = DB.schema('commute');


////////////////////////////////////////////////////////////////////////////////////
// Helper functions
////////////////////////////////////////////////////////////////////////////////////

var userRole = (function(user) {
	if (user.role == 'admin') {
		return 'ROLE_ADMIN'
	} else if (user.role == 'author') {
		return 'ROLE_AUTHOR';
	} else  if (user.role == 'viewer') {
		return 'ROLE_VIEWER';
	} else {
		return 'ROLE_USER';
	}
});


////////////////////////////////////////////////////////////////////////////////////
// Functions
////////////////////////////////////////////////////////////////////////////////////

var importUsers = () => {

	var deferred = Promise.pending();

	var stream = fs.createReadStream(config.import.users.filePath);

	var csvStream = csv({ headers: true })
		.on("data", function(user) {
			console.log("Loaded user: " + JSON.stringify(user));

			var userModel = {
				gender: user.gender,
				firstname: user.firstname,
				lastname: user.lastname,
				email: user.email,
				role: userRole(user),
				token: uuid.v4()
			};

			return db.knex("users").insert(userModel).then(function() {
				console.log("Saved user: " + JSON.stringify(user));
			}).catch(function(err) {
				console.log("Failed to save user: " + JSON.stringify(err));
			});
		})
		.on("error", function(err) {
			logger.error(`Failed to import users. Error: ${err.message || err}`);
			deferred.reject(err);
		})
		.on("end", function() {
			deferred.resolve();
			console.log("done");
		});

	stream.pipe(csvStream);

	return deferred.promise;
};


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	importUsers: importUsers
};