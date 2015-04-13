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
var request = require('request');

var logger = require('../log/logger');
var security = require('../lib/security');

var config = require('../conf/config');

var calendars = require('./calendars');
var calendarDates = require('./calendarDates');
var routes = require('./routes');
var stations = require('./stations');
var stops = require('./stops');
var stopTimes = require('./stopTimes');
var stopTimesFull = require('./stopTimesFull');
var trips = require('./trips');

var agencyService = require('../service/agencyService');


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

router.use('/:agencyKey/calendars', calendars);
router.use('/:agencyKey/calendar-dates', calendarDates);
router.use('/:agencyKey/routes', routes);
router.use('/:agencyKey/stations', stations);
router.use('/:agencyKey/stops', stops);
router.use('/:agencyKey/stop-times', stopTimes);
router.use('/:agencyKey/stop-times-full', stopTimesFull);
router.use('/:agencyKey/trips', trips);

router.get('/', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	agencyService.findAgencies().then((agencies) => {

		agencies.forEach((agency) => {

			agency.links = [{
				"href": `${baseApiURL(req)}/agencies/${agency.agency_key}`,
				"rel": "http://gtfs.helyx.io/api/agency",
				"title": `Agency '${agency.agency_key}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agency.agency_key}/routes`,
				"rel": "http://gtfs.helyx.io/api/routes",
				"title": `Routes`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agency.agency_key}/trips`,
				"rel": "http://gtfs.helyx.io/api/trips",
				"title": `Trips`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agency.agency_key}/stops`,
				"rel": "http://gtfs.helyx.io/api/stops",
				"title": `Stops`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agency.agency_key}/calendars`,
				"rel": "http://gtfs.helyx.io/api/calendars",
				"title": `Calendars`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agency.agency_key}/calendar-dates`,
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


router.get('/nearest', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var lat = req.query.lat;
	var lon = req.query.lon;

	var url = `${config.services.gtfsApi.baseURL}/api/agencies/nearest?lat=${lat}&lon=${lon}`

	logger.info(`Url: ${url}`)

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

	//agencyService.findNearestAgencies({ lat:req.query.lat , lon: req.query.lon }).then((agency) => {
	//
	//	agency.links = [{
	//		"href": `${baseApiURL(req)}/agencies/${agency.agency_key}`,
	//		"rel": "http://gtfs.helyx.io/api/agency",
	//		"title": `Agency '${agency.agency_id}'`
	//	}, {
	//		"href": `${baseApiURL(req)}/agencies/${agency.agency_key}/routes`,
	//		"rel": "http://gtfs.helyx.io/api/routes",
	//		"title": `Routes`
	//	}, {
	//		"href": `${baseApiURL(req)}/agencies/${agency.agency_key}/trips`,
	//		"rel": "http://gtfs.helyx.io/api/trips",
	//		"title": `Trips`
	//	}, {
	//		"href": `${baseApiURL(req)}/agencies/${agency.agency_key}/stops`,
	//		"rel": "http://gtfs.helyx.io/api/stops",
	//		"title": `Stops`
	//	}, {
	//		"href": `${baseApiURL(req)}/agencies/${agency.agency_key}/calendars`,
	//		"rel": "http://gtfs.helyx.io/api/calendars",
	//		"title": `Calendars`
	//	}, {
	//		"href": `${baseApiURL(req)}/agencies/${agency.agency_key}/calendar-dates`,
	//		"rel": "http://gtfs.helyx.io/api/calendar-dates",
	//		"title": `Calendar dates`
	//	}];
	//
	//	res.json(format(agency));
	//
	//}).catch((err) => {
	//	logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
	//	res.status(500).json({message: err.message});
	//});

});

router.get('/:agencyKey', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyKey = req.params.agencyKey;

	agencyService.findAgencyByKey(agencyKey).then((agency) => {

		if (!agency) {
			res.status(404).end();
		}
		else {
			agency.links = [{
				"href": `${baseApiURL(req)}/agencies`,
				"rel": "http://gtfs.helyx.io/api/agencies",
				"title": `Agencies`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/routes`,
				"rel": "http://gtfs.helyx.io/api/routes",
				"title": `Routes`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/trips`,
				"rel": "http://gtfs.helyx.io/api/trips",
				"title": `Trips`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/stops`,
				"rel": "http://gtfs.helyx.io/api/stops",
				"title": `Stops`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/calendars`,
				"rel": "http://gtfs.helyx.io/api/calendars",
				"title": `Calendars`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/calendar-dates`,
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
