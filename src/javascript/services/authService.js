////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var logger = require('winston');

var bcrypt = require('bcryptjs');

var config = require('../conf/config');

var DB = require('../lib/db');
var db = DB.schema('commute');

var mandrill = require('mandrill-api/mandrill');
var mandrillClient = new mandrill.Mandrill(config.service.mandrill.apiKey);

var uuid = require('uuid');

var moment = require('moment');

var Promise = require('bluebird');


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

var checkRoleAnonymous = (req, action) => {
	logger.info("User is authenticated: " + (req.isAuthenticated()));
	return !req.isAuthenticated() || req.user.role === ROLE_ANONYMOUS;

};

var checkRoleAgent = (req, action) => {
	return req.isAuthenticated() && req.user.role === ROLE_AGENT;
};

var checkRoleSuperAgent = (req, action) => {
	return req.isAuthenticated() && req.user.role === ROLE_SUPER_AGENT
};

var checkRoleAdmin = (req, action) => {
	return req.isAuthenticated() && req.user.role === ROLE_ADMIN

};

var failureHandler = (req, res, action) => {
	if (req.isAuthenticated()) {
		res.send(401, "Unauthorized");
	} else {
		res.send(403, "Forbidden");
	}
};

var serializeUser = (user, done) => {
	var userId = user && user.id;
	done(null, userId);
};

var deserializeUserFromToken = (token, done) => {
	return db.knex("users").where({ token: token }).then((foundUser) => {
		if (!foundUser || foundUser.length != 1) {
			done(new Error(`User not found for token: '${token}'`));
		}
		else {
			done(undefined, foundUser[0]);
		}
	}).catch((err) => {
		done(err);
	});
};

var deserializeUserFromUserId = (userId, done) => {
	return db.knex("users").where({ id: userId }).then((foundUser) => {
		if (!foundUser || foundUser.length != 1) {
			done(new Error(`User not found for user id: '${userId}'`));
		}
		else {
			done(undefined, foundUser[0]);
		}
	}).catch((err) => {
		done(err);
	});
};

var signUp = (firstname, lastname, username) => {

	var email = username;

	var resetToken = uuid.v4();

	var userModel = {
		firstname: firstname,
		lastname: lastname,
		email: email,
		role: userRole('user'),
		token: uuid.v4(),
		reset_token: resetToken,
		reset_demand_expiration_date: moment().add(2, 'hours').format('YYYY-MM-DDTHH:mm:ss')
	};

	return db.knex("users").insert(userModel).then(function() {
		return sendPasswordResetDemand('Sign Up', resetToken, username);
	});

};

var resetPassword = (username) => {

	var email = username;

	var resetToken = uuid.v4();

	return db.knex('users').where({ email: email }).update({
		reset_token: resetToken,
		reset_demand_expiration_date: moment().add(2, 'hours').format('YYYY-MM-DDTHH:mm:ss')
	}).then(() => {
		return sendPasswordResetDemand("Password reset", resetToken, email);
	});
};

var sendPasswordResetDemand = (subject, resetToken, username) => {

	var deferred = Promise.pending();

	sendPasswordResetDemandWithMandrill(subject, resetToken, username).then((result) => {
		deferred.resolve(result);
	}).catch((err) => {
		sendPasswordResetDemandWithMailGun(subject, resetToken, username).then(() => {

			deferred.resolve(result);
		}).catch((err) => {

		})
	});

	return deferred.promise;
};

var sendPasswordResetDemandWithMailGun =  (subject, resetToken, username) => {

	var email = username;

	var isDefaultPortForScheme =  (config.port == 80 && config.scheme == 'http') || (config.port == 443 && config.scheme == 'https');
	var linkBaseURL = isDefaultPortForScheme ? `${config.scheme}://${config.host}` : `${config.scheme}://${config.host}:${config.port}`;

	var link = `${linkBaseURL}/?#/password/change?token=${resetToken}`;

	var deferred = Promise.pending();

	var message = {
		"html": `<a href="${link}">${link}</a>`,
		"text": link,
		"subject": `Commute - ${subject}`,
		"from_email": "no-reply@commute.sh",
		"from_name": "Commute",
		"to": [{
			"email": email,
			"name": "Commute",
			"type": "to"
		}],
		"headers": {
			"Reply-To": "no-reply@commute.sh"
		}
	};

	mandrillClient.messages.send({"message": message}, function(result) {
		logger.debug("Mail send result: " + JSON.stringify(result));
		deferred.resolve(result);
	}, function(err) {
		logger.error('A mandrill error occurred: ' + err.name + ' - ' + err.message);
		deferred.reject(err);
	});

	return deferred.promise;

};


var sendPasswordResetDemandWithMandrill = (subject, resetToken, username) => {

	var email = username;

	var isDefaultPortForScheme =  (config.port == 80 && config.scheme == 'http') || (config.port == 443 && config.scheme == 'https');
	var linkBaseURL = isDefaultPortForScheme ? `${config.scheme}://${config.host}` : `${config.scheme}://${config.host}:${config.port}`;

	var link = `${linkBaseURL}/?#/password/change?token=${resetToken}`;

	var deferred = Promise.pending();

	var message = {
		"html": `<a href="${link}">${link}</a>`,
		"text": link,
		"subject": `Commute - ${subject}`,
		"from_email": "no-reply@commute.sh",
		"from_name": "Commute",
		"to": [{
			"email": email,
			"name": "Commute",
			"type": "to"
		}],
		"headers": {
			"Reply-To": "no-reply@commute.sh"
		}
	};

	mandrillClient.messages.send({"message": message}, function(result) {
		logger.debug("Mail send result: " + JSON.stringify(result));
		deferred.resolve(result);
	}, function(err) {
		logger.error('A mandrill error occurred: ' + err.name + ' - ' + err.message);
		deferred.reject(err);
	});

	return deferred.promise;

};


var changePassword = (resetToken, password) => {
	if (!resetToken) {
		return Promise.reject(new Error('Empty token provided'));
	} else if (!password) {
		return Promise.reject(new Error('Empty password provided'));
	}

	return db.knex('users').where({ reset_token: resetToken }).then((foundUsers) => {
		if (!foundUsers || foundUsers.length != 1) {
			return Promise.reject(new Error('No matching user found with reset token: ' + resetToken));
		} else if (moment().isAfter(moment(foundUsers[0].reset_demand_expiration_date))) {
			return Promise.reject(new Error('Reset token has expired'));
		} else {
			return db.knex('users').where({ reset_token: resetToken }).update({
				password: bcrypt.hashSync(password, bcrypt.genSaltSync()),
				reset_token: ''
			});
		}
	});
};

var checkPasswordResetTokenIsValid = (resetToken) => {
	if (!resetToken) {
		return Promise.reject(new Error('Empty token provided'));
	}

	return db.knex('users').where({ reset_token: resetToken }).then((foundUsers) => {
		if (!foundUsers || foundUsers.length != 1) {
			return Promise.reject(new Error('No matching user found with reset token: ' + resetToken));
		} else if (moment().isAfter(moment(foundUsers[0].reset_demand_expiration_date))) {
			return Promise.reject(new Error('Reset token has expired'));
		} else {
			return Promise.resolve(true);
		}
	});
};


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	serializeUser: serializeUser,
	deserializeUserFromUserId: deserializeUserFromUserId,
	deserializeUserFromToken: deserializeUserFromToken,
	checkRoleAnonymous: checkRoleAnonymous,
	checkRoleAdmin: checkRoleAdmin,
	checkRoleSuperAgent: checkRoleSuperAgent,
	checkRoleAgent: checkRoleAgent,
	failureHandler: failureHandler,
	signUp: signUp,
	resetPassword: resetPassword,
	changePassword: changePassword,
	checkPasswordResetTokenIsValid: checkPasswordResetTokenIsValid,
	ROLE_AGENT: ROLE_AGENT,
	ROLE_SUPER_AGENT: ROLE_SUPER_AGENT,
	ROLE_ADMIN: ROLE_ADMIN,
	ROLE_ANONYMOUS: ROLE_ANONYMOUS
};
