////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');
var util = require('util');

var moment = require('moment');
var _ = require('lodash');

var logger = require('../log/logger');
var DB = require('../lib/db');

var redisClient = require('redis').createClient();
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

var findLinesByStopIdAndDate = (agencyId, stopId, date, ignoreDay) => {

	var dayOfWeek = dayOfWeekAsString(moment(date, 'YYYY-MM-DD').format('E'));

	var db = DB.schema(agencyId);

	var fetchStart = Date.now();
	var cacheKey = `/agencies/${agencyId}/${stopId}/${date}?ignoreDay=${ignoreDay}`;

	return Cache.fetch(redisClient, cacheKey).otherwhise({ expiry: 3600 }, (callback) => {
		var start = Date.now();

		var query = db.knex
			.select('*')
			.from('stop_times_full')
			.innerJoin('calendars', 'stop_times_full.service_id', 'calendars.service_id')
			.where({ stop_id: stopId })
			.andWhere('start_date', '<=', date)
			.andWhere('end_date', '>=', date);

		if (ignoreDay != 1) {
			query.andWhere(dayOfWeek, 1);
		}

		query.orderBy('arrival_time');

		query.then((stopTimesFull) => {

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
		logger.info(`Data Fetch for key: '${cacheKey}' Done in ${Date.now() - fetchStart} ms`);
		return lines;
	});

};


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	findLinesByStopIdAndDate: findLinesByStopIdAndDate
};

