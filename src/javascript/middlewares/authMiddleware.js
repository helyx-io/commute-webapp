////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var BasicStrategy = require('passport-http').BasicStrategy;
var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
var ClientJWTBearerStrategy = require('passport-oauth2-jwt-bearer').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var config = require('../conf/config');
var _ = require('underscore');
var models  = require('../models');

var AccessToken = models.AccessToken;
var PemClient = models.PemClient;
var Client = models.Client;
var User = models.User;

////////////////////////////////////////////////////////////////////////////////////
// Strategies
////////////////////////////////////////////////////////////////////////////////////

var ClientJWTBearerStrategy = new ClientJWTBearerStrategy(
	function(claimSetIss, done) {
		PemClient.find({ where: { id: claimSetIss }}).complete((err, pemClient) => {
			if (err) {
				return done(err);
			} else if (!pemClient) {
				return done(null, false);
			} else {
				return done(null, pemClient);
			}
		});
	}
);

var GoogleStrategy = new GoogleStrategy({
	clientID: config.auth.google.clientId,
	clientSecret: config.auth.google.clientSecret,
	callbackURL: config.auth.google.callbackUrl
}, (accessToken, refreshToken, identifier, profile, done) => {
	return process.nextTick(() => {
		profile.identifier = identifier;
		User.find({
			where: { email: profile.emails[0].value }
		}).complete((err, user) => {
			if (err) {
				return done(err, null);
			} else if (!user) {
				var user = User.build({
					email: profile.emails[0].value,
					firstName: profile.name.givenName,
					lastName: profile.name.familyName,
					gender: profile._json.gender,
					avatarUrl: profile._json.picture ? profile._json.picture : "images/avatar_placeholder.png",
					googleId: profile.id,
					role: _.some(config.auth.admin, profile.emails[0].value) ? "ROLE_ADMIN" : "ROLE_USER"
				});
				user.save().complete((err, user) => {
					return done(err, profile);
				});
			} else {
				user.firstName = profile.name.givenName;
				user.lastName = profile.name.familyName;
				user.gender = profile._json.gender;
				user.googleId = profile.id;
				user.avatarUrl = profile._json.picture ? profile._json.picture : "images/avatar_placeholder.png";
				user.role = _.some(config.auth.admin, profile.emails[0].value) ? "ROLE_ADMIN" : "ROLE_USER";

				user.save().complete((err) => {
					return done(err, profile);
				});
			}
		});
	});
});

/*
 BasicStrategy & ClientPasswordStrategy

 These strategies are used to authenticate registered OAuth clients.  They are
 employed to protect the `token` endpoint, which consumers use to obtain
 access tokens.  The OAuth 2.0 specification suggests that clients use the
 HTTP Basic scheme to authenticate.  Use of the client password strategy
 allows clients to send the same credentials in the request body (as opposed
 to the `Authorization` header).  While this approach is not recommended by
 the specification, in practice it is quite common.
 */
var BasicStrategy = new BasicStrategy((username, password, done) => {
	Client.find({
		where: { clientId: clientId }
	}).complete((err, client) => {
		if (err) {
			return done(err);
		}
		if (!client) {
			return done(null, false);
		}
		if (client.clientSecret !== password) {
			return done(null, false);
		}
		return done(null, client);
	});
});

ClientPasswordStrategy = new ClientPasswordStrategy((clientId, clientSecret, done) => {
	Client.find({
		where: { clientId: clientId }
	}).complete((err, client) => {
		if (err) {
			return done(err);
		}
		if (!client) {
			return done(null, false);
		}
		if (client.clientSecret !== clientSecret) {
			return done(null, false);
		}
		return done(null, client);
	});
});

/*
 BearerStrategy

 This strategy is used to authenticate users based on an access token (aka a
 bearer token).  The user must have previously authorized a client
 application, which is issued an access token to make requests on behalf of
 the authorizing user.
 */
var BearerStrategy = new BearerStrategy((accessToken, done) => {
	return AccessTokens.find(accessToken, (err, token) => {
		if (err) {
			return done(err);
		}
		if (!token) {
			return done(null, false);
		}
		User.find({
			where: { userID: token.userID }
		}).complete((err, user) => {
			var info;
			if (err) {
				return done(err);
			}
			if (!user) {
				return done(null, false);
			}
			info = {
				scope: "*"
			};
			return done(null, user, info);
		});
	});
});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	GoogleStrategy: GoogleStrategy,
	BasicStrategy: BasicStrategy,
	ClientPasswordStrategy: ClientPasswordStrategy,
	BearerStrategy: BearerStrategy,
	ClientJWTBearerStrategy: ClientJWTBearerStrategy
};
