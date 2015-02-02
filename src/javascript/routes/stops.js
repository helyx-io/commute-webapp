////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');
var util = require('util');
var qs = require('querystring');

var express = require('express');
var passport = require('passport');
var moment = require('moment');

var security = require('../lib/security');
var DB = require('../lib/db');

var logger = require('../log/logger');

var stopService = require('../service/stopService');


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


router.get('/', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;

	stopService.findStops(agencyId, 1000).then((stops) => {
		if (withLinks(req)) {
			stops.forEach((stop) => {
				stop.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}`,
					"rel": "http://gtfs.helyx.io/api/agency",
					"title": `Agency '${agencyId}'`
				}, {
					"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${stop.stop_id}`,
					"rel": "http://gtfs.helyx.io/api/stop",
					"title": `Stop '${stop.stop_id}'`
				}];
			});
		}

		res.json(format(stops));
	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});
});


router.get('/nearest'/*, security.ensureJWTAuthenticated*/, (req, res) => {

	var agencyId = req.params.agencyId;
	var lat = req.query.lat;
	var lon = req.query.lon;
	var distance = req.query.distance;

	stopService.findLinesByStopIdAndDate(agencyId, lat, lon, distance).then((stops) => {
		if (withLinks(req)) {
			stops.forEach((stop) => {
				stop.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}`,
					"rel": "http://gtfs.helyx.io/api/agency",
					"title": `Agency '${agencyId}'`
				}, {
					"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${stop.stop_id}`,
					"rel": "http://gtfs.helyx.io/api/stop",
					"title": `Stop '${stop.stop_id}'`
				}];
			});
		}

		res.json(format(stops));
	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});
});

router.get('/:date/nearest'/*, security.ensureJWTAuthenticated*/, (req, res) => {

	var agencyId = req.params.agencyId;
	var lat = req.query.lat;
	var lon = req.query.lon;
	var distance = req.query.distance;
	var date = req.params.date;

	stopService.findNearestStopsByDate(agencyId, lat, lon, distance, date).then((stops) => {
		res.json(stops);
	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});
});


router.get('/:stopId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var stopId = req.params.stopId;

	stopService.findStopById(agencyId, stopId).then((stop) => {
		if (!stop) {
			res.status(404).end();
		}
		else {
			stop.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/stops`,
				"rel": "http://gtfs.helyx.io/api/stops",
				"title": `Stops`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${stopId}/stop-times`,
				"rel": "http://gtfs.helyx.io/api/stop-times",
				"title": `Stop times`
			}];

			res.json(format(stop));
		}
	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/:stopId/stop-times', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;

	var stopId = req.params.stopId;
//	var date = moment(req.params.date, 'YYYYMMDD');

	stopService.findStopTimesByStopId(agencyId, stopId, 1000).then((stopTimes) => {

		stopTimes.forEach((stopTime) => {

			stopTime.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/stop-times/${stopTime.stop_id}`,
				"rel": "http://gtfs.helyx.io/api/stop-time",
				"title": `Stoptime [Stop: '${stopTime.stop_id}' - Stop Name: '${stopTime.Stop.stop_name}' - Departure time: '${stopTime.Stop.departure_time}']`
			}];

			if (stopTime.stop) {
				stop.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${stopTime.stop_id}`,
					"rel": "http://gtfs.helyx.io/api/stop",
					"title": `Stop '${stopTime.stop_id}'`
				}];
			}

		});

		res.json(format(stopTimes));

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
