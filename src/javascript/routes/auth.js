////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var express = require('express');
var passport = require('passport');

var security = require('../lib/security');

var oauth2orize = require('oauth2orize');
var jwtBearer = require('oauth2orize-jwt-bearer').Exchange;
var crypto = require('crypto');

var DB = require('../lib/db');
var db = DB.schema('gtfs');


////////////////////////////////////////////////////////////////////////////////////
// Auth Server
////////////////////////////////////////////////////////////////////////////////////

var server = oauth2orize.createServer();

server.exchange('urn:ietf:params:oauth:grant-type:jwt-bearer', jwtBearer(function (client, data, signature, done) {

	new db.PemClient({id: client.id}).then((pem) => {
		var pub = pem.publicKey;

		var verifier = crypto.createVerify("RSA-SHA256");
		//verifier.update takes in a string of the data that is encrypted in the signature
		verifier.update(data);

		if (!verifier.verify(pub, signature, 'base64')) {
			throw new Error("Could not verify data: '" + data + "' with signature: '" + signature + "'");
		}

		//base64url decode data
		var b64string = data;
		var buf = new Buffer(b64string, 'base64').toString('ascii');

		// TODO - verify client_id, scope and expiration are valid from the buf variable above

		var accessToken = new db.AccessToken({
			clientID: client.id
		});

		return accessToken.save();
	}).then((accessToken) => {
		done(null, accessToken);
	}).catch((err) => {
		done(err);
	});

}));


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router();

router.post('/token', security.ensureJWTAuthenticated, server.token(), server.errorHandler());

router.post('/login', passport.authenticate('local', (req, res) => {
	return res.redirect("/");
}));

router.get('/login', (req, res) => {
	return res.render('login');
});

router.get('/logout', (req, res) => {
	req.logout();
	return res.redirect("/auth/login");
});

router.get('/google', passport.authenticate('google', {
	scope: 'https://www.googleapis.com/auth/plus.me https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
	failureRedirect: '/#/login'
}));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/#/login' }), (req, res) => {
	return res.redirect("/");
});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
