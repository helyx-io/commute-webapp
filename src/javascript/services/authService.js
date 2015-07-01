////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');
var bcrypt = require('bcryptjs');
var uuid = require('uuid');
var moment = require('moment');
var Promise = require('bluebird');

var config = require('../conf/config');
var logger = require('../lib/logger');

var emailService = require('./emailService');

var DB = require('../lib/db');
var db = DB.schema('commute');


////////////////////////////////////////////////////////////////////////////////////
// Constants
////////////////////////////////////////////////////////////////////////////////////

var ROLE_AGENT = "ROLE_AGENT";
var ROLE_SUPER_AGENT = "ROLE_SUPER_AGENT";
var ROLE_ADMIN = "ROLE_ADMIN";
var ROLE_ANONYMOUS = "ROLE_ANONYMOUS";


////////////////////////////////////////////////////////////////////////////////////
// Templates
////////////////////////////////////////////////////////////////////////////////////

var RESET_PASSWORD_HTML_EMAIL_TPL = fs.readFileSync(`${__dirname}/../templates/email/reset-password.html`, 'utf-8');
var RESET_PASSWORD_TEXT_EMAIL_TPL = fs.readFileSync(`${__dirname}/../templates/email/reset-password.txt`, 'utf-8');


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
	return db.knex("users").where({ token: token }).first().then((foundUser) => {
		if (!foundUser) {
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
	return db.knex("users").where({ id: userId }).first().then((foundUser) => {
		if (!foundUser) {
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

	return db.knex('users').where({ email: email }).first().then((user) => {

		if (user) {
			var error = new Error(`Email '${email}' already match an existing account.`);
			error.code = "UNKNOWN_EMAIL";
			error.reason = `Email '${email}' already match an existing account.`;
			return Promise.reject(error);
		} else {
			return db.knex("users").insert(userModel).then(function () {
				return sendPasswordResetDemand('Sign Up', resetToken, username);
			});
		}
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


	return db.knex('users').where({ email: email }).first().then((user) => {

		if (!user) {
			var error = new Error(`Email '${email}' does not match an existing account. Please contact commute.io.`);
			error.code = "UNKNOWN_EMAIL";
			error.reason = `Email '${email}' does not match an existing account. Please contact commute.io.`;
			return Promise.reject(error);
		} else {
			var resetToken = user.resetToken || uuid.v4();

			var userDataToUpdate = {
				resetToken: resetToken,
				resetDemandExpirationDate: moment().add(2, 'hours').format('YYYY-MM-DDTHH:mm:ss')
			};

			return db.knex('users').where({ email: email }).update(userDataToUpdate).then(() => {

				var isDefaultPortForScheme =  (config.port == 80 && config.scheme == 'http') || (config.port == 443 && config.scheme == 'https');
				var linkBaseURL = isDefaultPortForScheme ? `${config.scheme}://${config.host}` : `${config.scheme}://${config.host}:${config.port}`;

				var link = `${linkBaseURL}/api/auth/password/reset?token=${resetToken}`;

				var htmlBody =  RESET_PASSWORD_HTML_EMAIL_TPL.replace(/\$\{link\}/g, link).replace(/\$\{givenName\}/g, user.givenName);
				var textBody = RESET_PASSWORD_TEXT_EMAIL_TPL.replace(/\$\{link\}/g, link).replace(/\$\{givenName\}/g, user.givenName);
				var subject = "Commute.io - Password reset";

				return emailService.sendEmail(email, user.givenName, subject, htmlBody, textBody, undefined, 'Commute.io');
			});

		}
	})
};

var sendPasswordResetDemand = (subject, resetToken, username) => {

	var deferred = Promise.pending();

	sendPasswordResetDemand(subject, resetToken, username).then((result) => {
		deferred.resolve(result);
	}).catch((err) => {
		sendPasswordResetDemand(subject, resetToken, username).then(() => {

			deferred.resolve(result);
		}).catch((err) => {

		})
	});

	return deferred.promise;
};

var sendPasswordResetDemand =  (subject, resetToken, username) => {

	var email = username;

	var isDefaultPortForScheme =  (config.port == 80 && config.scheme == 'http') || (config.port == 443 && config.scheme == 'https');
	var linkBaseURL = isDefaultPortForScheme ? `${config.scheme}://${config.host}` : `${config.scheme}://${config.host}:${config.port}`;

	var link = `${linkBaseURL}/#/password/change?token=${resetToken}`;

	var text = link;
	var html = `<a href="${link}">${link}</a>`;

	return emailService.sendEmail(email, username, subject, html, text, undefined, 'Commute.io');
};


var sendPasswordResetDemand = (subject, resetToken, username) => {

	var email = username;

	var isDefaultPortForScheme =  (config.port == 80 && config.scheme == 'http') || (config.port == 443 && config.scheme == 'https');
	var linkBaseURL = isDefaultPortForScheme ? `${config.scheme}://${config.host}` : `${config.scheme}://${config.host}:${config.port}`;

	var link = `${linkBaseURL}/#/password/change?token=${resetToken}`;

	var text = link;
	var html = `<a href="${link}">${link}</a>`;

	return emailService.sendEmail(email, username, subject, html, text, undefined, 'Commute.io');
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
