////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var BearerStrategy = require('passport-http-bearer');
var config = require('../../conf/config');
var DB = require('../../lib/db');
var db = DB.schema('commute');


////////////////////////////////////////////////////////////////////////////////////
// Strategies
////////////////////////////////////////////////////////////////////////////////////

/*
 BearerStrategy

 This strategy is used to authenticate users based on an access token (aka a
 bearer token).  The user must have previously authorized a client
 application, which is issued an access token to make requests on behalf of
 the authorizing user.
 */
var accessTokenStrategy = new BearerStrategy((accessToken, done) => {
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

module.exports = accessTokenStrategy;
