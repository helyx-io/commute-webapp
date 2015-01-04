////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');
var util = require('util');

var _ = require('lodash');
var express = require('express');
var moment = require('moment');
var passport = require('passport');
var qs = require('querystring');

var logger = require('../log/logger');
var security = require('../lib/security');

var calendars = require('./calendars');
var calendarDates = require('./calendarDates');
var routes = require('./routes');
var stations = require('./stations');
var stops = require('./stops');
var stopTimes = require('./stopTimes');
var stopTimesFull = require('./stopTimesFull');
var trips = require('./trips');

var DB = require('../lib/db');


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


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router({mergeParams: true});

router.use('/:agencyId/calendars', calendars);
router.use('/:agencyId/calendarDates', calendarDates);
router.use('/:agencyId/routes', routes);
router.use('/:agencyId/stations', stations);
router.use('/:agencyId/stops', stops);
router.use('/:agencyId/stop-times', stopTimes);
router.use('/:agencyId/stop-times-full', stopTimesFull);
router.use('/:agencyId/trips', trips);

router.get('/', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var db = DB.schema('gtfs');

	db.Agencies.query( (q) => q ).fetch().then((agencies) => {

		agencies = agencies.toJSON();

		agencies.forEach((agency) => {

			agency.links = [{
				"href": `${baseApiURL(req)}/agencies/${agency.agency_id}`,
				"rel": "http://gtfs.helyx.io/api/agency",
				"title": `Agency '${agency.agency_id}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agency.agency_id}/routes`,
				"rel": "http://gtfs.helyx.io/api/routes",
				"title": `Routes`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agency.agency_id}/trips`,
				"rel": "http://gtfs.helyx.io/api/trips",
				"title": `Trips`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agency.agency_id}/stops`,
				"rel": "http://gtfs.helyx.io/api/stops",
				"title": `Stops`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agency.agency_id}/calendars`,
				"rel": "http://gtfs.helyx.io/api/calendars",
				"title": `Calendars`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agency.agency_id}/calendar-dates`,
				"rel": "http://gtfs.helyx.io/api/calendar-dates",
				"title": `Calendar dates`
			}];

		});

		res.json(format(agencies));

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/:agencyId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema('gtfs');

	new db.Agency({ agency_id: agencyId }).fetch().then((agency) => {

		if (!agency) {
			res.status(404).end();
		}
		else {
			var agency = agency.toJSON();

			agency.links = [{
				"href": `${baseApiURL(req)}/agencies`,
				"rel": "http://gtfs.helyx.io/api/agencies",
				"title": `Agencies`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/routes`,
				"rel": "http://gtfs.helyx.io/api/routes",
				"title": `Routes`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/trips`,
				"rel": "http://gtfs.helyx.io/api/trips",
				"title": `Trips`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/stops`,
				"rel": "http://gtfs.helyx.io/api/stops",
				"title": `Stops`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/calendars`,
				"rel": "http://gtfs.helyx.io/api/calendars",
				"title": `Calendars`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/calendar-dates`,
				"rel": "http://gtfs.helyx.io/api/calendar-dates",
				"title": `Calendar dates`
			}];

			res.json(format(agency));
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
