////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var passport = require('passport');
var Promise = require('bluebird');
var util = require('util');
var _ = require('lodash');
var uuid = require('uuid');

var logger = require('../lib/logger');
var DB = require('../lib/db');


////////////////////////////////////////////////////////////////////////////////////
// Functions
////////////////////////////////////////////////////////////////////////////////////

var authenticate = (req, res, next) => {


	passport.authenticate('local', (err, user, info) => {
		if (err) {
			console.log(`[AUTH] Error: ${util.inspect(err)}`);
			res.status(401).end();
			return;
		}

		if (!user) {
			console.log(`[AUTH] Error: User not found.`);
			res.status(401).end();
			return;
		}

		console.log(`[AUTH] user found: ${JSON.stringify(user)}`);

		req.login(user, (err) => {
			if (err) {
				logger.error(`Error: ${err.message}`);
				res.status(500).end();
				return ;
			}
			res.status(200).header("X-Token", user.token).end();
		});
	})(req, res, next);

};

var userRole = (user) => {
	var userRoleCheck = false;

	var adminGroup = "admin";

	if (util.isArray(user.memberOf)) {
		userRoleCheck = _.filter(user.memberOf, (userGroup) => userGroup.indexOf(adminGroup) >= 0 );
	} else {
		userRoleCheck = user.memberOf && user.memberOf.indexOf(adminGroup) >= 0;
	}

	return userRoleCheck ? "ROLE_ADMIN" : "ROLE_USER";
};


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	authenticate: authenticate
};
