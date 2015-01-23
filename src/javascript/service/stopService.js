////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');
var util = require('util');

var logger = require('../log/logger');
var DB = require('../lib/db');

var stopTimesFullService = require('../service/stopTimesFullService');
var tripService = require('../service/tripService');

var redisClient = require('redis').createClient();
var Cache = require("../lib/cache");


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var findStops = (agencyId, limit) => {

	var db = DB.schema(agencyId);

	return db.Stops.query( (q) => q.limit(limit) ).fetch().then((stop) => {
		return stop.toJSON();
	});
};


var findNearestStops = (agencyId, lat, lon, distance) => {

	var db = DB.schema(agencyId);

	var fetchStart = Date.now();
	var cacheKey = `/agencies/${agencyId}/stops/nearest?lat=${lat}&lon=${lon}&distance=${distance}`;

	return Cache.fetch(redisClient, cacheKey).otherwhise({ expiry: 3600 }, (callback) => {
		var start = Date.now();
		// select st_distance(point(48.85341, 2.34880), stop_geo) as distance, s.* from stops s order by distance asc
		db.Stops.query( (q) => {
			return q
				.select(db.knex.raw(`111195 * st_distance(point(${lat}, ${lon}), stop_geo) as stop_distance`))
				.where(db.knex.raw(`111195 * st_distance(point(${lat}, ${lon}), stop_geo)  < ${distance}`))
				.orderBy('stop_distance', 'asc')
		}).fetch().then((stops) => {
			stops = stops.toJSON();
			logger.info(`DB Query Done in ${Date.now() - start} ms`);
			callback(undefined, stops);
		});
	}).then((stops) => {
		logger.info(`Data Fetch for key: '${cacheKey}' Done in ${Date.now() - fetchStart} ms`);

		return stops;
	});
};


var findNearestStopsByDate = (agencyId, lat, lon, distance, date, ignoreDay) => {

	return findNearestStops(agencyId, lat, lon, distance).then((stops) => {
		return Promise.all(stops.map((stop) => {
			return stopTimesFullService.findLinesByStopIdAndDate(agencyId, stop.stop_id, date, ignoreDay).then((lines) => {
				lines.forEach((line) => {
					if (line.stop_times.length > 0) {
						line.trip_id = line.stop_times[0].trip_id;
						line.route_color = line.stop_times[0].route_color;
						line.route_text_color = line.stop_times[0].route_text_color;
					}
				});

				return Promise.all(lines.map((line) => {
					return tripService.findStopTimesByTripId(agencyId, line.trip_id).then((stopTimes) => {
						line.first_stop = stopTimes.length > 0 ? stopTimes[0].stop : null;
						line.last_stop = stopTimes.length > 0 ? stopTimes[stopTimes.length - 1].stop : null;

						return line;
					});
				})).then((lines) => {
					stop.lines = lines;

					return stop;
				});
			});
		}));
	});
};


var findStopById = (agencyId, stopId) => {

	var db = DB.schema(agencyId);

	return new db.Stop({ stop_id: stopId }).fetch().then((stop) => {
		return stop.toJSON();
	});
};


var findStopTimesByStopId = (agencyId, stopId, limit) => {

	var db = DB.schema(agencyId);

	return db.StopTimes.query( (q) => q.where({ stop_id: stopId }).limit(limit) ).fetch({ withRelated: ['stop'] }).then((stopTimes) => {
		return stopTimes.toJSON();
	});
};


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	findStops: findStops,
	findLinesByStopIdAndDate: findNearestStops,
	findNearestStopsByDate: findNearestStopsByDate,
	findStopById: findStopById,
	findStopTimesByStopId: findStopTimesByStopId
};

