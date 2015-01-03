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

var daysOfWeek = {
	1: "Monday",
	2: "Tuesday",
	3: "Wednesday",
	4: "Thursday",
	5: "Friday",
	6: "Saturday",
	7: "Sunday"
};

var dayOfWeekAsString = (day) => {
	return daysOfWeek[day];
};


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

	var date = req.params.date;
	var dayOfWeek = dayOfWeekAsString(moment(req.params.date, 'YYYY-MM-DD').format('E'));

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	var stopId = req.params.stopId;

	db.knex
		.select('*')
		.from('stop_times_full')
		.innerJoin('calendars', 'stop_times_full.service_id', 'calendars.service_id')
		.where({ stop_id: stopId })
			.andWhere('start_date', '<=', date)
			.andWhere('end_date', '>=', date)
			.andWhere(dayOfWeek, 1)
		.orderBy('arrival_time')
	.then((stopTimesFull) => {
		res.json(formatAsStopTimeFull(stopTimesFull));
	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
