////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
var ClientJWTBearerStrategy = require('passport-oauth2-jwt-bearer').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var config = require('../conf/config');
var _ = require('underscore');

var DB = require('../lib/db');
var db = DB.schema('gtfs');


////////////////////////////////////////////////////////////////////////////////////
// Strategies
////////////////////////////////////////////////////////////////////////////////////

var clientJWTBearerStrategy = new ClientJWTBearerStrategy(
	function(claimSetIss, done) {
		new db.PemClient({ id: claimSetIss }).fetch().then((pemClient) => {
			if (!pemClient) {
				done(null, false);
			} else {
				done(null, pemClient);
			}
		}).catch((err) => {
			done(err);
		});
	}
);

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


var clientPasswordStrategy = new ClientPasswordStrategy((clientId, clientSecret, done) => {
	new db.Client({ clientId: clientId }).fetch().then((client) => {
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
	}).catch((err) => {
		done(err);
	});
});

/*
 BearerStrategy

 This strategy is used to authenticate users based on an access token (aka a
 bearer token).  The user must have previously authorized a client
 application, which is issued an access token to make requests on behalf of
 the authorizing user.
 */
var bearerStrategy = new BearerStrategy((accessToken, done) => {
	new db.AccessTokens({ token: accessToken }).fetch().then((token) => {
		if (!token) {
			done(null, false);
		}
		else {
			new db.User({ userID: token.userID }).fetch().then((user) => {
				if (!user) {
					done(null, false);
				}
				else {
					var info = {
						scope: "*"
					};
					done(null, user, info);
				}
			});
		}
	}).catch((err) => {
		done(err);
	});
});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	GoogleStrategy: googleStrategy,
	ClientPasswordStrategy: clientPasswordStrategy,
	BearerStrategy: bearerStrategy,
	ClientJWTBearerStrategy: clientJWTBearerStrategy
};
