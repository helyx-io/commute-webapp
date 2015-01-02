////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var logger = require('winston');

var DB = require('../lib/db');
var db = DB.schema('gtfs');


////////////////////////////////////////////////////////////////////////////////////
// Constants
////////////////////////////////////////////////////////////////////////////////////

var ROLE_AGENT = "ROLE_AGENT";
var ROLE_SUPER_AGENT = "ROLE_SUPER_AGENT";
var ROLE_ADMIN = "ROLE_ADMIN";
var ROLE_ANONYMOUS = "ROLE_ANONYMOUS";


////////////////////////////////////////////////////////////////////////////////////
// Functions
////////////////////////////////////////////////////////////////////////////////////

var checkRoleAnonymous = function(req, action) {
	logger.info("User is authenticated: " + (req.isAuthenticated()));
	return !req.isAuthenticated() || req.user.role === ROLE_ANONYMOUS;

};

var checkRoleAgent = function(req, action) {
	return req.isAuthenticated() && req.user.role === ROLE_AGENT;
};

var checkRoleSuperAgent = function(req, action) {
	return req.isAuthenticated() && req.user.role === ROLE_SUPER_AGENT
};

var checkRoleAdmin = function(req, action) {
	return req.isAuthenticated() && req.user.role === ROLE_ADMIN

};

var authenticateUser = function(email, password, done) {
	db.Users({ email: email }).fetch().then((user) => {
		if (!user) {
			done(null, false);
		}
		else if (user.password !== password) {
			done(null, false);
		}
		else {
			done(null, user);
		}
	}).catch((err) => {
		done(err);
	});
};

var failureHandler = function(req, res, action) {
	if (req.isAuthenticated()) {
		res.send(401, "Unauthorized");
	} else {
		res.send(403, "Forbidden");
	}
};

var serializeUser = function(user, done) {
	var googleId = user.id;
	done(null, googleId);
};

var deserializeUser = function(id, done) {
	return new db.User({id: id}).fetch().then((user) => {
		done(undefined, user.toJSON());
	}).catch((err) => {
		done(err);
	});
};


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	authenticateUser: authenticateUser,
	serializeUser: serializeUser,
	deserializeUser: deserializeUser,
	checkRoleAnonymous: checkRoleAnonymous,
	checkRoleAdmin: checkRoleAdmin,
	checkRoleSuperAgent: checkRoleSuperAgent,
	checkRoleAgent: checkRoleAgent,
	failureHandler: failureHandler,
	ROLE_AGENT: ROLE_AGENT,
	ROLE_SUPER_AGENT: ROLE_SUPER_AGENT,
	ROLE_ADMIN: ROLE_ADMIN,
	ROLE_ANONYMOUS: ROLE_ANONYMOUS
};
