////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');
var util = require('util');

var logger = require('../log/logger');
var DB = require('../lib/db');


var redisClient = require('redis').createClient();
var Cache = require("../lib/cache");


////////////////////////////////////////////////////////////////////////////////////
// Functions
////////////////////////////////////////////////////////////////////////////////////

var findTrips = (agencyId) => {

	var db = DB.schema(agencyId);

	return db.TripServices.query( (q) => q ).fetch().then((trips) => {

		return trips.toJSON();
	});
};


var findByTripId = (agencyId, tripId) => {

	var db = DB.schema(agencyId);

	return new db.TripService({ trip_id: tripId }).fetch().then((trip) => {

		return !trip ? undefined : trip.toJSON();
	});
};


var findStopTimesByTripId = (agencyId, tripId) => {

	var db = DB.schema(agencyId);

	var fetchStart = Date.now();
	var cacheKey = `/agencies/${agencyId}/${tripId}/stop-times`;
	return Cache.fetch(redisClient, cacheKey).otherwhise({ expiry: 3600 }, (callback) => {
		var start = Date.now();

		db.StopTimes.query( (q) => q.where({trip_id: tripId}) ).fetch({ withRelated: ['stop'] }).then((stopTimes) => {
			logger.info(`DB Query Done in ${Date.now() - start} ms`);

			stopTimes = stopTimes.toJSON();

			stopTimes.sort(function(st1, st2) {
				return st1.stop_sequence - st2.stop_sequence
			});

			callback(undefined, stopTimes);
		});

	}).then((stopTimes) => {
		logger.info(`Data Fetch for key: '${cacheKey}' Done in ${Date.now() - fetchStart} ms`);
		return stopTimes;
	});
};


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	findTrips: findTrips,
	findByTripId: findByTripId,
	findStopTimesByTripId: findStopTimesByTripId
};

