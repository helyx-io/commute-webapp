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
	var cacheKey = `/agencies/${agencyKey}/${stopId}/${date}`;

	return Cache.fetch(redisClient, cacheKey).otherwhise({ expiry: 3600 }, (callback) => {
		var start = Date.now();

		var queryCalendar = db.knex
			.select('stop_times_full.*')
			.from('stop_times_full')
			.innerJoin('calendars', 'stop_times_full.service_id', 'calendars.service_id')
			.where({ stop_id: stopId })
			.andWhere('start_date', '<=', date)
			.andWhere('end_date', '>=', date)
			.andWhere(dayOfWeek, 1);

		var queryCalendarDates = db.knex
			.select('stop_times_full.*')
			.from('stop_times_full')
			.innerJoin('calendar_dates', 'stop_times_full.service_id', 'calendar_dates.service_id')
			.where({ stop_id: stopId })
			.andWhere('date', '=', date);

		Promise.all([queryCalendar, queryCalendarDates]).spread((stopTimesFullCalendar, stopTimesFullCalendarDates) => {

			var stopTimesFull = _.union(stopTimesFullCalendar, stopTimesFullCalendarDates);

			if (!stopTimesFull) {
				callback(undefined, []);
			}
			else {
				logger.info(`DB Query Done in ${Date.now() - start} ms`);

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
		logger.info(`[STOP_TIMES_FULL] Data Fetch for key: '${cacheKey}' Done in ${Date.now() - fetchStart} ms`);
		return lines;
	});

};


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	findLinesByStopIdAndDate: findLinesByStopIdAndDate
};

