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


////////////////////////////////////////////////////////////////////////////////////
// Helper functions
////////////////////////////////////////////////////////////////////////////////////

var baseApiURL = (req) => {
	return `${req.headers["x-forwarded-proto"] || req.protocol}://${req.headers.host}/api`;
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

var stationsToJSON = (data) => {

	if (util.isArray(data)) {
		return data.map((model) => {
			return stationsToJSON(model);
		});
	}

	data.id = data.station_id;
	data.name = data.station_name;
	data.location = {
		lat: data.station_lat,
		lon: data.station_lon
	};
	data.distance = data.station_distance

	delete data.station_id;
	delete data.station_name;
	delete data.station_lat;
	delete data.station_lon;
	delete data.station_geo;
	delete data.station_distance;

	delete data.created_at;
	delete data.updated_at;

	return data;
};


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router({mergeParams: true});


router.get('/'/*, security.ensureJWTAuthenticated*/, (req, res) => {

	var agencyKey = req.params.agencyKey;
	var db = DB.schema(agencyKey);

	// FIXME:  Add queryString to path
	var start = Date.now();
	db.Stations.query( (q) => q.limit(30000) ).fetch().then((stations) => {
		logger.info(`DB Query Done in ${Date.now() - start} ms`);

		res.json(stationsToJSON(stations.toJSON()));

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/nearest'/*, security.ensureJWTAuthenticated*/, (req, res) => {

	var agencyKey = req.params.agencyKey;
	var lat = req.query.lat;
	var lon = req.query.lon;
	var distance = req.query.distance || 1000;
	var db = DB.schema(agencyKey);

	var start = Date.now();

	// select st_distance(point(48.85341, 2.34880), stop_geo) as distance, s.* from stops s order by distance asc
	db.Stations.query( (q) => {
		return q
			.select(db.knex.raw(`111195 * st_distance(point(${lat}, ${lon}), station_geo) as station_distance`))
			.where(db.knex.raw(`111195 * st_distance(point(${lat}, ${lon}), station_geo)  < ${distance}`))
			.orderBy('station_distance', 'asc')
	}).fetch().then((stations) => {
		logger.info(`DB Query Done in ${Date.now() - start} ms`);

		res.json(stationsToJSON(stations.toJSON()));


	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
