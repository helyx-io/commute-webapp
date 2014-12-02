var fs = require('fs');
var jwt = require('jwt-simple');
var request = require('request');

var obj = {
	iss: 18,
	exp: 1417392628,
	"http://helyx.io/gtfs_data": true
};
var key = {
	key: fs.readFileSync(__dirname + '/data/private-key.pem').toString('ascii'),
	passphrase: 'OQ6PWCTdLMTE'
};
var alg = 'RS256';
var token = jwt.encode(obj, key, alg);

var body = {
	assertion: token,
	grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer"
};

request.post({ url: "http://localhost:9000/auth/token", body: body, json: true }, function(error, response, body) {

	if (error != undefined) {
		console.error("Error message: " + error.message);
	} else if (response.statusCode >= 404) {
		console.error("Error [StatusCode:" + response.statusCode + "] for url: '" + response.request.href + "' - Body: " + JSON.stringify(body));
	} else {
		console.info("Body: " + JSON.stringify(body));
	}

});