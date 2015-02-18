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

var logger = require('../log/logger');

var tripService = require('../service/tripService');


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

	tripService.findTrips(agencyKey).then((trips) => {

		trips.forEach((trip) => {

			trip.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyKey}`,
				"rel": "http://gtfs.helyx.io/api/agency",
				"title": `Agency '${agencyId}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/trips/${trip.trip_id}`,
				"rel": "http://gtfs.helyx.io/api/trip",
				"title": `Trip '${trip.trip_id}'`
			}];

		});

		res.json(trips);

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/:tripId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyKey = req.params.agencyKey;
	var agencyId = req.params.agencyId;

	var tripId = req.params.tripId;

	tripService.findByTripId(agencyKey, tripId).then((trip) => {

		if (!trip) {
			res.status(404).end();
		}
		else {
			trip.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/routes/${trip.route_id}`,
				"rel": "http://gtfs.helyx.io/api/route",
				"title": `Route '${trip.route_id}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/trips`,
				"rel": "http://gtfs.helyx.io/api/trips",
				"title": `Trips`
			}];

			res.json(format(trip));
		}
	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});

router.get('/:tripId/stop-times', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyKey = req.params.agencyKey;
	var agencyId = req.params.agencyId;

	var tripId = req.params.tripId;

	tripService.findStopTimesByTripId(agencyKey, tripId).then((stopTimes) => {

		stopTimes.forEach((stopTime) => {

			stopTime.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/trips/${tripId}`,
				"rel": "http://gtfs.helyx.io/api/trip",
				"title": `Trip '${tripId}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/stop-times/${stopTime.stop_id}`,
				"rel": "http://gtfs.helyx.io/api/stop-time",
				"title": `Stoptime [Stop: '${stopTime.stop_id}' - Stop Name: '${stopTime.stop.stop_name}' - Departure time: '${stopTime.stop.departure_time}']`
			}];

			if (stopTime.stop) {
				stopTime.stop.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyKey}/stops/${stopTime.stop_id}`,
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
