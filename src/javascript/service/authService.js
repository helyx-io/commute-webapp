////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var logger = require('winston');
var models = require('../models');

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
	if (!req.isAuthenticated()) {
		return action === ROLE_ANONYMOUS;
	}
};

var checkRoleAgent = function(req, action) {
	if (req.isAuthenticated() && req.user.role === ROLE_AGENT) {
		return true;
	}
};

var checkRoleSuperAgent = function(req, action) {
	if (req.isAuthenticated() && req.user.role === ROLE_SUPER_AGENT) {
		return true;
	}
};

var checkRoleAdmin = function(req, action) {
	if (req.isAuthenticated() && req.user.role === ROLE_ADMIN) {
		return true;
	}
};

var authenticateUser = function(email, password, done) {
	return db.users.findByEmail(email, function(err, user) {
		if (err) {
			return done(err);
		}
		if (!user) {
			return done(null, false);
		}
		if (user.password !== password) {
			return done(null, false);
		}
		return done(null, user);
	});
};

var failureHandler = function(req, res, action) {
	if (req.isAuthenticated()) {
		return res.send(401, "Unauthorized");
	} else {
		return res.send(403, "Forbidden");
	}
};

var serializeUser = function(user, done) {
	var googleId;
	googleId = user.id;
	return done(null, googleId);
};

var deserializeUser = function(id, done) {
	return models.User.find({where: {googleId: id}}).complete((err, user) => {
		return done(err, user);
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
