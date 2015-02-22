////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');
var util = require('util');

var _ = require('lodash');
var moment = require('moment');
var Promise = require('bluebird');

var logger = require('../log/logger');
var DB = require('../lib/db');

var config = require('../conf/config');

var redis = require('redis');
//redis.debug_mode = true;

var redisClient = redis.createClient(config.redis.port, config.redis.host);
var Cache = require("../lib/cache");


////////////////////////////////////////////////////////////////////////////////////
// Helper functions
////////////////////////////////////////////////////////////////////////////////////

var daysOfWeek = {
	1: "Monday",
	2: "Tuesday",
	3: "Wednesday",
	4: "Thursday",
	5: "Friday",
	6: "Saturday",
	7: "Sunday"
};

var dayOfWeekAsString = (day) => {
	return daysOfWeek[day];
};


////////////////////////////////////////////////////////////////////////////////////
// Functions
////////////////////////////////////////////////////////////////////////////////////

var findLinesByStopIdAndDate = (agencyKey, stopId, date) => {

	var dayOfWeek = dayOfWeekAsString(moment(date, 'YYYY-MM-DD').format('E'));

	var db = DB.schema(agencyKey);

	var fetchStart = Date.now();
	var cacheKey = `/agencies/${agencyKey}/stops/${stopId}/${date}/lines`;

	return Cache.fetch(redisClient, cacheKey).otherwhise({}, (callback) => {
		var queryCalendar = db.knex
			.select('stf.stop_id')
			.select('stf.service_id')
			.select('stf.stop_name')
			.select('stf.stop_desc')
			.select('stf.stop_lat')
			.select('stf.stop_lon')
			.select('stf.location_type')
			.select('stf.arrival_time')
			.select('stf.departure_time')
			.select('stf.stop_sequence')
			.select('stf.direction_id')
			.select('stf.route_short_name')
			.select('stf.route_type')
			.select('stf.route_color')
			.select('stf.route_text_color')
			.select('stf.trip_id')
			.from('stop_times_full as stf')
			.innerJoin('calendars', 'stf.service_id', 'calendars.service_id')
			.where({ stop_id: stopId })
			.andWhere('start_date', '<=', date)
			.andWhere('end_date', '>=', date)
			.andWhere(dayOfWeek, 1);

		var queryCalendarDates = db.knex
			.select('stf.stop_id')
			.select('stf.service_id')
			.select('stf.stop_name')
			.select('stf.stop_desc')
			.select('stf.stop_lat')
			.select('stf.stop_lon')
			.select('stf.location_type')
			.select('stf.arrival_time')
			.select('stf.departure_time')
			.select('stf.stop_sequence')
			.select('stf.direction_id')
			.select('stf.route_short_name')
			.select('stf.route_type')
			.select('stf.route_color')
			.select('stf.route_text_color')
			.select('stf.trip_id')
			.from('stop_times_full as stf')
			.innerJoin('calendar_dates', 'stf.service_id', 'calendar_dates.service_id')
			.where({ stop_id: stopId })
			.andWhere('date', '=', date);

		Promise.all([queryCalendar, queryCalendarDates]).spread((stopTimesFullCalendar, stopTimesFullCalendarDates) => {

			var stopTimesFull = _.union(stopTimesFullCalendar, stopTimesFullCalendarDates);

			if (!stopTimesFull) {
				callback(undefined, []);
			}
			else {
				var stopTimesFullByLine = _.groupBy(stopTimesFull, 'route_short_name');

				var lines = Object.keys(stopTimesFullByLine).map( (line) => {
					return {
						name: line,
						stop_times: stopTimesFullByLine[line]
					};
				});

				callback(undefined, lines);
			}
		});

	}).then((lines) => {
		logger.info(`[STOP_TIMES_FULL][FIND_LINES_BY_STOP_ID_AND_DATE] Data Fetch for key: '${cacheKey}' Done in ${Date.now() - fetchStart} ms`);
		return lines;
	});

};


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	findLinesByStopIdAndDate: findLinesByStopIdAndDate
};
