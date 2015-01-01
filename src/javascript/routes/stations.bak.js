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
var models = require('../models');

var logger = require('../log/logger');

var _ = require('lodash');

var DB = require('../lib/db');


////////////////////////////////////////////////////////////////////////////////////
// Cache Init
////////////////////////////////////////////////////////////////////////////////////

var redisClient = require('redis').createClient();
var Cacher = require("cacher");
var CacherRedis = require('cacher-redis');
var cacher = new Cacher(new CacherRedis(redisClient));
cacher.on("hit", (key) => {
	logger.info(`+++ Cache hit for key: ${key}`);
});
cacher.on("miss", (key) => {
	logger.info(`--- Cache miss for key: ${key}`);
});
cacher.on("error", (err) => {
	logger.info(`!!! Cache error for key: ${key}`);
});

var Cache = require("../lib/cache");


////////////////////////////////////////////////////////////////////////////////////
// Helper functions
////////////////////////////////////////////////////////////////////////////////////

var baseApiURL = (req) => {
	return `${req.headers["x-forwarded-proto"] || req.protocol}://${req.hostname}/api`;
};

var withLinks = (req) => {
	return req.query.links == 1
};

var withDesc = (req) => {
	return !(req.query.desc == 0)
};

var withTimestamps = (req) => {
	return req.query.timestamps == 1
};

var withLocations = (req) => {
	return req.query.locations == 1
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


var stopsToStationsMapper = (agencyId, stops, options) => {

	var stations = [];
	var stationMap = _.groupBy(stops, 'stop_name');

	Object.keys(stationMap).forEach((key) => {
		var stationStops = stationMap[key];
		var anyStationStop = stationStops[0];

		var station = {name: anyStationStop.stop_name};

		if (options.desc) {
			station.desc = anyStationStop.stop_desc;
		}

		stationStops.forEach((stop) => {
			stop.id = stop.stop_id;
			delete stop.stop_id;

			if (stop.stop_code != '') {
				stop.code = stop.stop_code;
			}
			delete stop.stop_code;

			delete stop.stop_name;
			delete stop.stop_desc;

			if (options.locations) {
				stop.location = {
					type: stop.location_type
				};

				if (stop.stop_lat != 0 && stop.stop_lon != 0) {
					stop.location.geo = {
						lat: stop.stop_lat,
						lng: stop.stop_lon
					};
				}

				if (stop.location.type == 0 && stop.location.geo == undefined) {
					delete stop.location;
				}
			}

			if (stop.stop_distance) {
				stop.distance = stop.stop_distance;
			}

			delete stop.location_type;
			delete stop.stop_geo;
			delete stop.stop_distance;
			delete stop.stop_lat;
			delete stop.stop_lon;

			if (stop.parent_station == 0) {
				delete stop.parent_station;
			}

			if (options.links) {
				stop.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}`,
					"rel": "http://gtfs.helyx.io/api/agency",
					"title": `Agency '${agencyId}'`
				}, {
					"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${stop.stop_id}`,
					"rel": "http://gtfs.helyx.io/api/stop",
					"title": `Stop '${stop.stop_id}'`
				}];
			}

			if (!options.timestamps) {
				delete stop.created_at;
				delete stop.updated_at;
			}

			delete stop.zone_id;
			delete stop.stop_url;
		});

		station.stops = stationStops;

		stations.push(station);
	});

	return stations

};

////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router({mergeParams: true});

router.get('/'/*, cacher.cache('minute', 10)*/ /*security.ensureJWTAuthenticated*/, (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	// FIXME:  Add queryString to path
	Cache.fetch(redisClient, `/agencies/${agencyId}/stations?${qs.stringify(req.query)}`).otherwhise({ expiry: 3600 }, (callback) => {
		var start = Date.now();
		db.Stops.query( (q) => q.limit(30000) ).fetch().then((stops) => {
			logger.info(`DB Query Done in ${Date.now() - start} ms`);

			stops = stops.toJSON();

			var options = {
				links: withLinks(req),
				desc: withDesc(req),
				timestamps: withTimestamps(req),
				locations: withLocations(req)
			};

			var stations = stopsToStationsMapper(agencyId, stops, options);

			callback(undefined, stations);
		});

	}).then((stations) => {
		res.json(format(stations));
	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});



router.get('/nearest'/*, cacher.cache('minute', 10)*/ /*security.ensureJWTAuthenticated*/, (req, res) => {

	var agencyId = req.params.agencyId;
	var lat = req.query.lat;
	var lon = req.query.lon;
	var distance = req.query.distance;
	var db = DB.schema(agencyId);

	// FIXME:  Add queryString to path
	Cache.fetch(redisClient, `/agencies/${agencyId}/stations/nearest?${qs.stringify(req.query)}`).otherwhise({ expiry: 3600 }, (callback) => {
		var start = Date.now();

		// select st_distance(point(48.85341, 2.34880), stop_geo) as distance, s.* from stops s order by distance asc
		db.Stops.query( (q) => q.select(db.knex.raw(`111195 * st_distance(point(${lat}, ${lon}), stop_geo) as stop_distance`)).where(db.knex.raw(`111195 * st_distance(point(${lat}, ${lon}), stop_geo)  < ${distance}`)).orderBy('stop_distance', 'asc')).fetch().then((stops) => {
			logger.info(`DB Query Done in ${Date.now() - start} ms`);

			stops = stops.toJSON();

			var options = {
				links: withLinks(req),
				desc: withDesc(req),
				timestamps: withTimestamps(req),
				locations: withLocations(req)
			};

			var stations = stopsToStationsMapper(agencyId, stops, options);

			callback(undefined, stations);
		});

	}).then((stations) => {
		res.json(format(stations));
	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
