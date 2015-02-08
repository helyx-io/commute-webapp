////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');
var util = require('util');

var _ = require('lodash');

var logger = require('../log/logger');
var DB = require('../lib/db');

var stopTimesFullService = require('../service/stopTimesFullService');
var tripService = require('../service/tripService');

var redis = require('redis');
//redis.debug_mode = true;

var redisClient = redis.createClient();
var Cache = require("../lib/cache");

String.prototype.capitalize = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
};


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

	// var fetchStart = Date.now();
	var cacheKey = `/agencies/${agencyId}/stops/nearest?lat=${lat}&lon=${lon}&distance=${distance}`;

	return Cache.fetch(redisClient, cacheKey).otherwhise({}, (callback) => {
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
//		logger.info(`Data Fetch for key: '${cacheKey}' Done in ${Date.now() - fetchStart} ms`);

		return stops;
	});
};

var findStopTimesByStopAndDate = (agencyId, stopId, date) => {
	var cacheKey = `/agencies/${agencyId}/stops/${stopId}/${date}`;

	return Cache.fetch(redisClient, cacheKey).otherwhise({}, (callback) => {

		return findStopById(agencyId, stopId).then((stop) => {

			stop.stop_name = stop.stop_name.capitalize();

			return stopTimesFullService.findLinesByStopIdAndDate(agencyId, stopId, date).then((lines) => {
				lines.forEach((line) => {
					if (line.stop_times.length > 0) {
						line.trip_id = line.stop_times[0].trip_id;
						line.route_color = line.stop_times[0].route_color;
						line.route_text_color = line.stop_times[0].route_text_color;
					}

					line.stop_times = line.stop_times.map((stopTime) => {
						return {
							departure_time: stopTime.departure_time,
							arrival_time: stopTime.arrival_time
						};
					});
				});

				return Promise.all(lines.map((line) => {
					return tripService.findStopTimesByTripId(agencyId, line.trip_id).then((stopTimes) => {
						line.first_stop_name = stopTimes.length > 0 ? stopTimes[0].stop.stop_name.capitalize() : null;
						line.last_stop_name = stopTimes.length > 0 ? stopTimes[stopTimes.length - 1].stop.stop_name.capitalize() : null;

						return line;
					});
				})).then((lines) => {
					stop.lines = lines;

					callback(undefined, stop);
				});
			});

		});

	}).then((stop) => {
//		logger.info(`Data Fetch for key: '${cacheKey}' Done in ${Date.now() - fetchStart} ms`);

		return stop;
	});
};

var findNearestStopsByDate = (agencyId, lat, lon, distance, date) => {

	return findNearestStops(agencyId, lat, lon, distance).then((stops) => {

		return Promise.all(stops.map((stop) => {
			return findStopTimesByStopAndDate(agencyId, stop.stop_id, date).then((foundStop) => {
				foundStop.stop_distance = stop.stop_distance;
				return foundStop;
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


var findStopById = (agencyId, stopId) => {

	var db = DB.schema(agencyId);

	return new db.Stop({ stop_id: stopId }).fetch().then((stop) => {
		return stop ? stop.toJSON() : stop;
	});
};


var findStopTimesByStopId = (agencyId, stopId) => {

	var db = DB.schema(agencyId);
	// var fetchStart = Date.now();
	var cacheKey = `/agencies/${agencyId}/stops/${stopId}/stop-times`;

	return Cache.fetch(redisClient, cacheKey).otherwhise({}, (callback) => {
		var start = Date.now();

		return db.StopTimes
			.query((q) => q.where({stop_id: stopId}))
			.fetch({withRelated: ['stop']})
			.then((stopTimes) => {
				stopTimes = stopTimes.toJSON();
				logger.info(`DB Query Done in ${Date.now() - start} ms`);
				callback(undefined, stopTimes);
			});
	}).then((stopTimes) => {
//		logger.info(`Data Fetch for key: '${cacheKey}' Done in ${Date.now() - fetchStart} ms`);

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

