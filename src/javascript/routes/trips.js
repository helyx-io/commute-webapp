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


var redisClient = require('redis').createClient();
var Cache = require("../lib/cache");


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
	var db = DB.schema(agencyId);

	db.TripServices.query( (q) => q ).fetch().then((trips) => {

		trips = trips.toJSON();

		trips.forEach((trip) => {

			trip.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}`,
				"rel": "http://gtfs.helyx.io/api/agency",
				"title": `Agency '${agencyId}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/trips/${trip.trip_id}`,
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

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	var tripId = req.params.tripId;

	new db.TripService({ trip_id: tripId }).fetch().then((trip) => {

		if (!trip) {
			res.status(404).end();
		}
		else {
			trip = trip.toJSON();

			trip.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/routes/${trip.route_id}`,
				"rel": "http://gtfs.helyx.io/api/route",
				"title": `Route '${trip.route_id}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/trips`,
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

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	var tripId = req.params.tripId;

	Cache.fetch(redisClient, `/agencies/${agencyId}/${tripId}/stop-times?${qs.stringify(req.query)}`).otherwhise({ expiry: 3600 }, (callback) => {
		var start = Date.now();

		db.StopTimes.query( (q) => q.where({trip_id: tripId}) ).fetch({ withRelated: ['stop'] }).then((stopTimes) => {
			logger.info(`DB Query Done in ${Date.now() - start} ms`);

			stopTimes = stopTimes.toJSON();

			stopTimes.sort(function(st1, st2) {
				return st1.stop_sequence - st2.stop_sequence
			});

			stopTimes.forEach((stopTime) => {

				stopTime.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}/trips/${tripId}`,
					"rel": "http://gtfs.helyx.io/api/trip",
					"title": `Trip '${tripId}'`
				}, {
					"href": `${baseApiURL(req)}/agencies/${agencyId}/stop-times/${stopTime.stop_id}`,
					"rel": "http://gtfs.helyx.io/api/stop-time",
					"title": `Stoptime [Stop: '${stopTime.stop_id}' - Stop Name: '${stopTime.stop.stop_name}' - Departure time: '${stopTime.stop.departure_time}']`
				}];

				if (stopTime.stop) {
					stopTime.stop.links = [{
						"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${stopTime.stop_id}`,
						"rel": "http://gtfs.helyx.io/api/stop",
						"title": `Stop '${stopTime.stop_id}'`
					}];
				}
			});

			callback(undefined, format(stopTimes));
		});

	}).then((data) => {
		res.json(format(data));
	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
