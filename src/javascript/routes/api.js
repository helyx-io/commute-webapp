////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var crypto = require('crypto');
var fs = require('fs');

var express = require('express');
var modulePackage = require('../package.json');
var security = require('../lib/security');
var oauth2orize = require('oauth2orize');
var jwtBearer = require('oauth2orize-jwt-bearer').Exchange;

var models = require('../models');

var PemClient = models.PemClient;
var AccessToken = models.AccessToken;

var passport = require('passport');


////////////////////////////////////////////////////////////////////////////////////
// Server
////////////////////////////////////////////////////////////////////////////////////

var server = oauth2orize.createServer();

server.exchange('urn:ietf:params:oauth:grant-type:jwt-bearer', jwtBearer(function (client, data, signature, done) {

	PemClient.find({where: {id: client.id}}).complete((err, pem) => {
		if (err != undefined) {
			done(err);
		} else {
			var pub = pem.publicKey;

			var verifier = crypto.createVerify("RSA-SHA256");
			//verifier.update takes in a string of the data that is encrypted in the signature
			verifier.update(data);

			if (verifier.verify(pub, signature, 'base64')) {
				//base64url decode data
				var b64string = data;
				var buf = new Buffer(b64string, 'base64').toString('ascii');

				// TODO - verify client_id, scope and expiration are valid from the buf variable above

				var accessToken = AccessToken.build({
					clientID: client.id,
					scope: scope
				});
				accessToken.save().complete((err, accessToken) => {
					if (err != undefined) {
						done(err);
					}
					else {
						done(null, accessToken);
					}
				});
			}
			else {
				done(new Error("Could not verify data: '" + data + "' with signature: '" + signature + "'"));
			}
		}
	});

}));


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router();

router.get('/', security.ensureAuthenticated, (req, res) => {
	res.json({version: modulePackage.version});
});

router.post('/token', passport.authenticate(['oauth2-jwt-bearer'], { session: false }), server.token(), server.errorHandler());

////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
