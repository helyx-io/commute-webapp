////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');

var qs = require('querystring');

var express = require('express');
var passport = require('passport');

var moment = require('moment');

var util = require('util');

var security = require('../lib/security');

var logger = require('../log/logger');

var _ = require('lodash');

var DB = require('../lib/db');

var stopTimesFullService = require('../service/stopTimesFullService');


////////////////////////////////////////////////////////////////////////////////////
// Helper functions
////////////////////////////////////////////////////////////////////////////////////

var baseApiURL = (req) => {
	return `${req.headers["x-forwarded-proto"] || req.protocol}://${req.hostname}/api`;
};

var withLinks = (req) => {
	return req.query.links == 1
};

var format = (data) => {

	if (util.isArray(data)) {
		return data.map((model) => {
			return format(model);
		});
	}
	else {
		if (data.created_at) {
			data.created_at = moment(data.created_at).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
		}
		if (data.updated_at) {
			data.updated_at = moment(data.updated_at).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
		}
	}

	return data;
};

var formatAsStopTimeFull = (data) => {
	if (util.isArray(data)) {
		return data.map((model) => {
			return formatAsStopTimeFull(format(model));
		});
	}
	else {
		return data;
	}
};


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router({mergeParams: true});

router.get('/:stopId/:date', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var stopId = req.params.stopId;
	var date = req.params.date;
	var ignoreDay = req.query.ignoreDay;

	stopTimesFullService.findLinesByStopIdAndDate(agencyId, stopId, date, ignoreDay).then((data) => {
		res.json(format(formatAsStopTimeFull(data)));
	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
