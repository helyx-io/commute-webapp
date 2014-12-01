var fs = require('fs');
var jwt = require('jwt-simple');
var request = require('request');

var obj = { foo: 'bar' };
var key = {
	key: fs.readFileSync(__dirname + '/test.pem').toString('ascii'),
	passphrase: 'vj_ZRHWt7uoq'
};
var alg = 'RS256';
var token = jwt.encode(obj, key, alg);


request.post({ url: "http://localhost:9000/api/token", body: {assertion: token}, json: true }, function(error, response, body) {

	if (error != undefined) {
		console.error("Error message: " + error.message);
	} else if (response.statusCode >= 404) {
		console.error("Error [StatusCode:" + response.statusCode + "] for url: '" + response.request.href + "' - Body: " + body);
	} else {
		console.info("Body: " + body);
	}

});