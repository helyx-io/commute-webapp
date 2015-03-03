////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');
var util = require('util');

var _ = require('lodash');

var logger = require('../log/logger');
var DB = require('../lib/db');

var Promise = require('bluebird');

var config = require('../conf/config');

var stopTimesFullService = require('../service/stopTimesFullService');
var tripService = require('../service/tripService');

var redis = require('redis');
//redis.debug_mode = true;

var redisClient = redis.createClient(config.redis.port, config.redis.host);
var Cache = require("../lib/cache");

String.prototype.capitalize = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
};


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var findStops = (agencyKey, limit) => {

	var db = DB.schema(agencyKey);

	return db.Stops.query( (q) => q.limit(limit) ).fetch().then((stop) => {
		return stop.toJSON();
	});
};

var findNearestStops = (agencyKey, lat, lon, distance) => {

	var db = DB.schema(agencyKey);

	var fetchStart = Date.now();
	var cacheKey = `/agencies/${agencyKey}/stops/nearest?lat=${lat}&lon=${lon}&distance=${distance}`;

	return Cache.fetch(redisClient, cacheKey).otherwhise({ timeout: 3600 }, (callback) => {
		var start = Date.now();
		// select st_distance(point(48.85341, 2.34880), stop_geo) as distance, s.* from stops s order by distance asc
		db.knex
			.select([ '*', db.knex.raw(`111195 * st_distance(point(${lat}, ${lon}), stop_geo) as stop_distance`) ])
			.from(`stops`)
			.whereRaw(`111195 * st_distance(point(${lat}, ${lon}), stop_geo) < ${distance}`)
			.orderBy('stop_distance', 'asc')
		.then((stops) => {
			logger.info(`DB Query Done in ${Date.now() - start} ms`);
			callback(undefined, stops);
		});
	}).then((stops) => {
		logger.info(`[STOP_SERVICE][FIND_NEAREST_STOPS] Data Fetch for key: '${cacheKey}' Done in ${Date.now() - fetchStart} ms`);

		return stops;
	});
};

var findStopTimesByStopAndDate = (agencyKey, stop, date) => {
	var cacheKey = `/agencies/${agencyKey}/stops/${stop.stop_id}/${date}/stop-times`;
	var fetchStart = Date.now();

//	return Cache.fetch(redisClient, cacheKey).otherwhise({}, (callback) => {

		stop.stop_name = stop.stop_name.toUpperCase();

		return stopTimesFullService.findLinesByStopIdAndDate(agencyKey, stop.stop_id, date).then((lines) => {
			lines.forEach((line) => {
				if (line.stop_times.length > 0) {
					line.name = line.name.toUpperCase();
					line.trip_id = line.stop_times[0].trip_id;
					line.route_color = line.stop_times[0].route_color;
					if (line.route_color) {
						line.route_color = line.route_color.toUpperCase();
					}
					line.route_text_color = line.stop_times[0].route_text_color;
					if (line.route_text_color) {
						line.route_text_color = line.route_text_color.toUpperCase();
					}
					line.route_type = line.stop_times[0].route_type;
				}

				line.stop_times = line.stop_times.map((stopTime) => {
					return {
						departure_time: stopTime.departure_time,
						arrival_time: stopTime.arrival_time
					};
				});
			});

			var tripIds = lines
				.filter((line) => {
					return line.trip_id;
				})
				.map((line) => {
					return line.trip_id;
				});

			return tripService.findStopTimesByTripIds(agencyKey, tripIds).then((stopsTimesSets) => {

				if (stopsTimesSets) {

					lines.forEach((line, i) => {
						var stopTimes = stopsTimesSets[i];

						if (stopTimes) {
							line.first_stop_name = stopTimes.length > 0 ? stopTimes[0].stop_name.capitalize() : null;
							line.last_stop_name = stopTimes.length > 0 ? stopTimes[stopTimes.length - 1].stop_name.capitalize() : null;
						}
					});

				}

				stop.lines = lines;

				return stop;
//				callback(undefined, stop);
			});
		});

	//}).then((stop) => {
	//	logger.info(`[STOP_SERVICE][FIND_STOP_TIMES_BY_STOP_AND_DATE] Data Fetch for key: '${cacheKey}' Done in ${Date.now() - fetchStart} ms`);
	//
	//	return stop;
	//});
};

var findNearestStopsByDate = (agencyKey, lat, lon, distance, date) => {

	return findNearestStops(agencyKey, lat, lon, distance).then((stops) => {

		return Promise.all(stops.map((stop) => {
			return findStopTimesByStopAndDate(agencyKey, stop, date).then((completeStop) => {
				return completeStop;
			});
		})).then((stops) => {
			var remappedStops = _.values(_.groupBy(stops, (stop) => {
				return stop.stop_name + stop.stop_desc + stop.location_type;
			})).filter((stop) => {
				return stop[0].lines.length > 0;
			}).map((stops) => {
				return {
					name: stops[0].stop_name,
					desc: stops[0].stop_desc,
					distance: stops[0].stop_distance,
					location_type: stops[0].location_type,
					geo_location: {
						lat: stops[0].stop_lat,
						lon: stops[0].stop_lon
					},
					stop_ids: _.pluck(stops, 'stop_id'),
					lines: _.flatten(_.pluck(stops, 'lines'))
				};
			});
			return remappedStops;
		});
	});
};


var findStopById = (agencyKey, stopId) => {
	return new DB.schema(agencyKey).knex.select('*').from(`stops`).where(`stop_id < ${stopId}`)
};


var findStopTimesByStopId = (agencyKey, stopId) => {

	var db = DB.schema(agencyKey);
	var fetchStart = Date.now();
	var cacheKey = `/agencies/${agencyKey}/stops/${stopId}/stop-times`;

	return Cache.fetch(redisClient, cacheKey).otherwhise({}, (callback) => {
		var start = Date.now();

		return db.StopTimes
			.query((q) => q.where({ stop_id: stopId }))
			.fetch({ withRelated: ['stop'] })
			.then((stopTimes) => {
				stopTimes = stopTimes.toJSON();
				logger.info(`DB Query Done in ${Date.now() - start} ms`);
				callback(undefined, stopTimes);
			});
	}).then((stopTimes) => {
		logger.info(`[STOP] Data Fetch for key: '${cacheKey}' Done in ${Date.now() - fetchStart} ms`);

		return stopTimes;
	});
};

////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	findStops: findStops,
	findLinesByStopIdAndDate: findNearestStops,
	findNearestStopsByDate: findNearestStopsByDate,
	findStopTimesByStopAndDate: findStopTimesByStopAndDate,
	findStopById: findStopById,
	findStopTimesByStopId: findStopTimesByStopId
};

