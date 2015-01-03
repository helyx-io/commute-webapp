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
// Helper functions
////////////////////////////////////////////////////////////////////////////////////

var baseApiURL = (req) => {
	return `${req.headers["x-forwarded-proto"] || req.protocol}://${req.hostname}/api`;
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


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router({mergeParams: true});


router.get('/agencies/:agencyId/routes', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	var routeShortname = req.query.routeShortName;

	var query = { agency_id: agencyId};

	if (routeShortname) {
		query.route_short_name = routeShortname;
	}

	db.Routes.query( (q) => q.where(query) ).fetch().then((routes) => {
		routes = routes.toJSON();

		routes.forEach((route) => {

			route.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}`,
				"rel": "http://gtfs.helyx.io/api/agency",
				"title": `Agency '${agencyId}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/routes/${route.route_id}`,
				"rel": "http://gtfs.helyx.io/api/route",
				"title": `Route '${route.route_id}'`
			}];

		});

		return Promise.all(routes.map((route) => {

			return new db.Trip({route_id: route.route_id}).fetch()
				.then((trip) => {
					return db.StopTimes
						.query( (q) => q.where({trip_id: trip.id}).orderBy('stop_sequence', 'asc') )
						.fetch({ withRelated: ['stop'] });
				})
				.then((stopTimes) => {
					route.first_stop = stopTimes.models[0].related('stop').toJSON();
					route.first_stop.links = [{
						"href": (baseApiURL(req) + "/agencies/" + agencyId + "/stops/" + route.first_stop.stop_id),
						"rel": "http://gtfs.helyx.io/api/stop",
						"title": ("Stop '" + route.first_stop.stop_id + "'")
					}];

					route.last_stop = stopTimes.models[stopTimes.length - 1].related('stop').toJSON();
					route.last_stop.links = [{
						"href": (baseApiURL(req) + "/agencies/" + agencyId + "/stops/" + route.last_stop.stop_id),
						"rel": "http://gtfs.helyx.io/api/stop",
						"title": ("Stop '" + route.last_stop.stop_id + "'")
					}];

					return route;
				});
		}));
	})
		.then((routes)=> {
			res.json(format(routes));
		}).catch((err) => {
			logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
			res.status(500).json({message: err.message});
		});

});


router.get('/agencies/:agencyId/routes/:routeId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	var routeId = req.params.routeId;

	new db.Route({agency_id: agencyId, route_id: routeId}).fetch().then((route) => {

		if (!route) {
			res.status(404).end();
		}
		else {
			var route = route.toJSON();

			route.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/routes`,
				"rel": "http://gtfs.helyx.io/api/routes",
				"title": `Routes`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/routes/${routeId}/trips`,
				"rel": "http://gtfs.helyx.io/api/trips",
				"title": `Trips`
			}];

			res.json(format(route));
		}

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/routes/:routeId/trips', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	var routeId = req.params.routeId;

	db.TripServices.query( (q) => q.where({route_id: routeId}) ).fetch().then((trips) => {

		trips = trips.toJSON();

		trips.forEach((trip) => {

			trip.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/routes/${routeId}`,
				"rel": "http://gtfs.helyx.io/api/route",
				"title": `Route '${routeId}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/trips/${trip.trip_id}`,
				"rel": "http://gtfs.helyx.io/api/trip",
				"title": `Trip '${trip.trip_id}'`
			}];

			return trip;
		});

		res.json(format(trips));

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
