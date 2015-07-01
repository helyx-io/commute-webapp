////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var passport = require('passport');
var Promise = require('bluebird');
var util = require('util');
var _ = require('lodash');
var uuid = require('uuid');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var logger = require('../../lib/logger');
var config = require('../../conf/config');
var DB = require('../../lib/db');
var db = DB.schema('commute');



////////////////////////////////////////////////////////////////////////////////////
// Strategy
////////////////////////////////////////////////////////////////////////////////////

var googleStrategy = new GoogleStrategy({
	clientID: config.auth.google.clientId,
	clientSecret: config.auth.google.clientSecret,
	callbackURL: config.auth.google.callbackUrl
}, (accessToken, refreshToken, identifier, profile, done) => {
	process.nextTick(() => {
		profile.identifier = identifier;
		new db.User({ email: profile.emails[0].value }).fetch().then((user) => {
			if (!user) {
				user = new db.User({
					email: profile.emails[0].value,
					firstName: profile.name.givenName,
					lastName: profile.name.familyName,
					gender: profile._json.gender,
					avatarUrl: profile._json.picture ? profile._json.picture : "images/avatar_placeholder.png",
					googleId: profile.id,
					role: _.some(config.auth.admin, profile.emails[0].value) ? "ROLE_ADMIN" : "ROLE_USER"
				});
			} else {
				user.firstName = profile.name.givenName;
				user.lastName = profile.name.familyName;
				user.gender = profile._json.gender;
				user.googleId = profile.id;
				user.avatarUrl = profile._json.picture ? profile._json.picture : "images/avatar_placeholder.png";
				user.role = _.some(config.auth.admin, profile.emails[0].value) ? "ROLE_ADMIN" : "ROLE_USER";
			}

			return user.save();
		}).then((profile) => {
			done(undefined, profile);
		}).catch((err) => {
			done(err, null);
		});
	});
});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = googleStrategy;
