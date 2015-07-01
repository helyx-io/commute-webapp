////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var express = require('express');
var request = require('request');

var logger = require('../lib/logger');
var security = require('../lib/security');

var config = require('../conf/config');

var stopRoute = require('./stopRoute');


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router({mergeParams: true});

router.use('/:agencyKey/stops', stopRoute);

router.get('/nearest', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var lat = req.query.lat;
	var lon = req.query.lon;

	var url = `${config.service.commute.baseURL}/api/agencies/nearest?lat=${lat}&lon=${lon}`;

	logger.info(`Url: ${url}`);

	request({ url: url }, (error, response, body) => {
		if (error) {
			logger.error(`[ERROR] Message: ${error.message} - ${error.stack}`);
			res.status(500).json({message: error.message});
		} else if (response.statusCode >= 300) {
			var err = new Error(`HTTP status code: ${response.statusCode}`);
			logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
			res.status(500).json({message: err.message});
		} else {
			res.header("Content-Type", "application/json").send(body);
		}
	});

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
