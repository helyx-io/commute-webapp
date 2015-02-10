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


////////////////////////////////////////////////////////////////////////////////////
// Helper functions
////////////////////////////////////////////////////////////////////////////////////

var baseApiURL = (req) => {
	return `${req.headers["x-forwarded-proto"] || req.protocol}://${req.headers.host}/api`;
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


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router({mergeParams: true});


router.get('/', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyKey = req.params.agencyKey;
	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyKey);

	db.CalendarDates.query((q) => q).fetch().then((calendarDates) => {

		calendarDates = calendarDates.toJSON();

		calendarDates.forEach((calendarDate) => {

			calendarDate.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyKey}`,
				"rel": "http://gtfs.helyx.io/api/agency",
				"title": `Agency '${agencyKey}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/calendar-dates/${serviceId}/${moment(calendarDate.date).format('YYYY-MM-DD')}`,
				"rel": "http://gtfs.helyx.io/api/calendar-date",
				"title": `Calendar date '${moment(calendarDate.date).format('YYYY-MM-DD')}'`
			}];

		});

		res.json(format(calendarDates));

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/:serviceId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyKey = req.params.agencyKey;
	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyKey);

	var serviceId = req.params.serviceId;

	db.CalendarDates.query((q) => q.where({ service_id: serviceId })).fetch().then((calendarDates) => {

		calendarDates = calendarDates.toJSON();

		calendarDates.forEach((calendarDate) => {

			calendarDate.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/calendars/${serviceId}`,
				"rel": "http://gtfs.helyx.io/api/calendar",
				"title": `Calendar '${serviceId}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/calendar-dates/${serviceId}/${moment(calendarDate.date).format('YYYY-MM-DD')}`,
				"rel": "http://gtfs.helyx.io/api/calendar-date",
				"title": `Calendar date '${moment(calendarDate.date).format('YYYY-MM-DD')}'`
			}];

		});

		res.json(format(calendarDates));

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/:serviceId/:date', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyKey = req.params.agencyKey;
	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyKey);

	var serviceId = req.params.serviceId;
	var date = req.params.date;

	new db.CalendarDate({ service_id: serviceId, date: date }).fetch().then((calendarDate) => {

		if (!calendarDate) {
			res.status(404).end();
		}
		else {
			var calendarDate = calendarDate.toJSON();

			calendarDate.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/calendar-dates/${serviceId}`,
				"rel": "http://gtfs.helyx.io/api/calendar-dates",
				"title": `Calendar dates`
			}];

			res.json(format(calendarDate));
		}

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
