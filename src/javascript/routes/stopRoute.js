////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var express = require('express');
var moment = require('moment');
var request = require('request');
var util = require('util');

var config = require('../conf/config');

var security = require('../lib/security');

var logger = require('../lib/logger');

var stopService = require('../services/stopService');


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router({mergeParams: true});

var findNearestStopsHandler = (req, res) => {

	var agencyKey = req.params.agencyKey;
	var lat = req.query.lat;
	var lon = req.query.lon;
	var distance = req.query.distance || 1000;
	var date = req.params.date || moment().format('YYYYMMDD');

	stopService.findNearestStops(agencyKey, lat, lon, distance, date, distance).then((result) => {
		res.header("Content-Type", "application/json").send(result);
	}).catch((err) => {
		logger.error(`Failed to get nearest stops - Err: ${util.inspect(err)}`);
		res.status(500).json({message: err.message});
	});

};

var findStopByIdHandler = (req, res) => {

	var agencyKey = req.params.agencyKey;
	var stopId = req.params.stopId;
	var date = req.params.date || moment().format('YYYYMMDD');
	var limit = Math.min(Number(req.query.limit || 3), 10);

	stopService.findStopById(agencyKey, stopId, date, limit).then((result) => {
		res.header("Content-Type", "application/json").send(result);
	}).catch((err) => {
		logger.error(`Failed to get nearest stops - Err: ${util.inspect(err)}`);
		res.status(500).json({message: err.message});
	});

};

router.get('/nearest'/*, security.ensureJWTAuthenticated*/, findNearestStopsHandler);

router.get('/:date/nearest'/*, security.ensureJWTAuthenticated*/, findNearestStopsHandler);

router.get('/:stopId(\\d+)'/*, security.ensureJWTAuthenticated*/, findStopByIdHandler);


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
