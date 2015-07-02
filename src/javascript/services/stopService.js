////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var express = require('express');
var moment = require('moment');
var request = require('request');
var Promise = require('bluebird');
var qs = require('querystring');

var config = require('../conf/config');

var security = require('../lib/security');

var logger = require('../lib/logger');


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var findNearestStops = (agencyKey, lat, lon, distance, date) => {

	var deferred = Promise.pending();

	var url = `${config.service.commute.baseURL}/api/agencies/${agencyKey}/stops/${date}/nearest?lat=${lat}&lon=${lon}&distance=${distance}`;
	logger.info(`Url: ${url}`);

	var start = moment();

	request({ url: url }, (error, response, body) => {

		logger.error('Duration: ' + moment.duration(moment().diff(start)).asMilliseconds());

		if (error) {
			logger.error(`[ERROR] Message: ${error.message} - ${error.stack}`);
			deferred.reject(error);
		} else if (response.statusCode >= 300) {
			var err = new Error(`HTTP status code: ${response.statusCode}`);
			logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
			deferred.reject(err);
		} else {
			deferred.resolve(body);
		}
	});

	return deferred.promise;

};

var findStopById = (agencyKey, stopId, date, limit) => {

	var deferred = Promise.pending();

	var url = `${config.service.commute.baseURL}/api/agencies/${agencyKey}/stops/${date}/${stopId}?limit=${limit}`;

	logger.info(`Url: ${url}`);

	request({ url: url }, (error, response, body) => {
		if (error) {
			logger.error(`[ERROR] Message: ${error.message} - ${error.stack}`);
			deferred.reject(error);
		} else if (response.statusCode >= 300) {
			var err = new Error(`HTTP status code: ${response.statusCode}`);
			logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
			deferred.reject(err);
		} else {
			deferred.resolve(body);
		}
	});

	return deferred.promise;

};


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	findNearestStops: findNearestStops,
	findStopById: findStopById
};
