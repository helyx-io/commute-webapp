////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');

var Promise = require('bluebird');

var express = require('express');
var passport = require('passport');

var moment = require('moment');

var util = require('util');

var modulePackage = require('../package.json');

var security = require('../lib/security');
var models = require('../models');

var logger = require('../log/logger');

var _ = require('lodash');

var DB = require('../lib/db');

var stations = require('./stations');

var daysOfWeek = {
	1: "Monday",
	2: "Tuesday",
	3: "Wednesday",
	4: "Thursday",
	5: "Friday",
	6: "Saturday",
	7: "Sunday"
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

var dayOfWeekAsString = (day) => {
	return daysOfWeek[day];
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

var router = express.Router();

router.use('/agencies/:agencyId/stations', stations);


router.get('/', (req, res) => {
	res.json({version: modulePackage.version});
});

router.get('/agencies', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var db = DB.schema('gtfs');

	db.Agencies.query( (q) => q ).fetch().then((agencies) => {

		agencies = agencies.toJSON();

		agencies.forEach((agency) => {

			agency.links = [{
				"href": `${baseApiURL(req)}/agencies/${agency.agency_id}`,
				"rel": "http://gtfs.helyx.io/api/agency",
				"title": `Agency '${agency.agency_id}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agency.agency_id}/routes`,
				"rel": "http://gtfs.helyx.io/api/routes",
				"title": `Routes`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agency.agency_id}/trips`,
				"rel": "http://gtfs.helyx.io/api/trips",
				"title": `Trips`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agency.agency_id}/stops`,
				"rel": "http://gtfs.helyx.io/api/stops",
				"title": `Stops`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agency.agency_id}/calendars`,
				"rel": "http://gtfs.helyx.io/api/calendars",
				"title": `Calendars`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agency.agency_id}/calendar-dates`,
				"rel": "http://gtfs.helyx.io/api/calendar-dates",
				"title": `Calendar dates`
			}];

		});

		res.json(format(agencies));

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema('gtfs');

	new db.Agency({ agency_id: agencyId }).fetch().then((agency) => {

		if (!agency) {
			res.status(404).end();
		}
		else {
			var agency = agency.toJSON();

			agency.links = [{
				"href": `${baseApiURL(req)}/agencies`,
				"rel": "http://gtfs.helyx.io/api/agencies",
				"title": `Agencies`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/routes`,
				"rel": "http://gtfs.helyx.io/api/routes",
				"title": `Routes`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/trips`,
				"rel": "http://gtfs.helyx.io/api/trips",
				"title": `Trips`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/stops`,
				"rel": "http://gtfs.helyx.io/api/stops",
				"title": `Stops`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/calendars`,
				"rel": "http://gtfs.helyx.io/api/calendars",
				"title": `Calendars`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/calendar-dates`,
				"rel": "http://gtfs.helyx.io/api/calendar-dates",
				"title": `Calendar dates`
			}];

			res.json(format(agency));
		}

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


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
	var date = req.query.date;

	var dayOfWeek = dayOfWeekAsString(moment(date, 'YYYY-MM-DD').format('E'));

	var calendarQuery = { model: Calendar };
	var calendarDateQuery = { model: CalendarDate };

	if (date != undefined) {
		calendarQuery.where = {
			start_date : { lte: date },
			end_date : { gte: date }
		};
		calendarQuery.where[dayOfWeek] = 1;

		calendarDateQuery.where = { date: date, exception_type: 1 };
	}


	db.TripServices.query( (q) => q.where({route_id: routeId}) ).fetch({ withRelated: [ 'calendar' ]}).then((trips) => {

		trips = trips.toJSON();

		trips.forEach((trip) => {

			if (trip.calendar != undefined) {

				trip.calendar.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}/calendars/${trip.service_id}`,
					"rel": "http://gtfs.helyx.io/api/calendar",
					"title": `Calendar '${trip.service_id}'`
				}];
			}

			if (trip.calendarDates != undefined) {
				trip.calendarDates.forEach((calendarDate) => {

					calendarDate.links = [{
						"href": `${baseApiURL(req)}/agencies/${agencyId}/calendar-dates/${trip.service_id}`,
						"rel": "http://gtfs.helyx.io/api/calendar-date",
						"title": `Calendar date '${trip.service_id}'`
					}];

				});
			}

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


router.get('/agencies/:agencyId/calendars', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	db.Calendars.query( (q) => q ).fetch().then((calendars) => {

		calendars = calendars.toJSON();

		calendars.forEach((calendar) => {

			calendar.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}`,
				"rel": "http://gtfs.helyx.io/api/agency",
				"title": `Calendar '${agencyId}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/calendars/${calendar.service_id}`,
				"rel": "http://gtfs.helyx.io/api/calendar",
				"title": `Calendar '${calendar.service_id}'`
			}];

		});

		res.json(format(calendars));

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/calendars/:serviceId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	var serviceId = req.params.serviceId;

	new db.Calendar({service_id: serviceId}).fetch().then((calendar) => {

		if (!calendar) {
			res.status(404).end();
		}
		else {
			var calendar = calendar.toJSON();

			calendar.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/calendars`,
				"rel": "http://gtfs.helyx.io/api/calendars",
				"title": `Calendars`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/calendar-dates/${serviceId}`,
				"rel": "http://gtfs.helyx.io/api/calendar-dates",
				"title": `Calendar dates`
			}];

			res.json(format(calendar));
		}

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/calendar-dates/:serviceId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	var serviceId = req.params.serviceId;

	db.CalendarDates.query((q) => q.where({ service_id: serviceId })).fetch().then((calendarDates) => {

		calendarDates = calendarDates.toJSON();

		calendarDates.forEach((calendarDate) => {

			calendarDate.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/calendars/${serviceId}`,
				"rel": "http://gtfs.helyx.io/api/calendar",
				"title": `Calendar '${serviceId}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/calendar-dates/${serviceId}/${moment(calendarDate.date).format('YYYY-MM-DD')}`,
				"rel": "http://gtfs.helyx.io/api/calendar-date",
				"title": `Calendar date '${moment(calendarDate.date).format('YYYY-MM-DD')}'`
			}];

		});

		res.json(format(calendarDates));

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/calendar-dates/:serviceId/:date', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	var serviceId = req.params.serviceId;
	var date = req.params.date;

	new db.CalendarDate({service_id: serviceId, date: date }).fetch().then((calendarDate) => {

		if (!calendarDate) {
			res.status(404).end();
		}
		else {
			var calendarDate = calendarDate.toJSON();

			calendarDate.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/calendar-dates/${serviceId}`,
				"rel": "http://gtfs.helyx.io/api/calendar-dates",
				"title": `Calendar dates`
			}];

			res.json(format(calendarDate));
		}

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/trips/:tripId/stop-times', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	var tripId = req.params.tripId;

	db.StopTimes.query( (q) => q.where({trip_id: tripId}) ).fetch({ withRelated: ['stop'] }).then((stopTimes) => {

		stopTimes = stopTimes.toJSON();

		stopTimes.forEach((stopTime) => {

			stopTime.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/trips/${tripId}`,
				"rel": "http://gtfs.helyx.io/api/trip",
				"title": `Trip '${tripId}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/stop-times/${stopTime.stop_id}`,
				"rel": "http://gtfs.helyx.io/api/stop-time",
				"title": `Stoptime [Stop: '${stopTime.stop_id}' - Stop Name: '${stopTime.stop.stop_name}' - Departure time: '${stopTime.stop.departure_time}']`
			}];

			if (stopTime.stop) {

				stop.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${stopTime.stop_id}`,
					"rel": "http://gtfs.helyx.io/api/stop",
					"title": `Stop '${stopTime.stop_id}'`
				}];

			}

		});

		res.json(format(stopTimes));

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/stop-times/:stopId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	var stopId = req.params.stopId;

	new db.StopTime({ stop_id: stopId }).fetch({ withRelated: ['stop'] }).then((stopTime) => {

		if (!stopTime) {
			res.status(404).end();
		}
		else {
			var stopTime = stopTime.toJSON();

			stopTime.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/trips/${stopTime.trip_id}`,
				"rel": "http://gtfs.helyx.io/api/trip",
				"title": `Trip '${stopTime.trip_id}'`
			}];

			if (stopTime.stop) {

				stop.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${stopTime.stop_id}`,
					"rel": "http://gtfs.helyx.io/api/stop",
					"title": `Stop '${stopTime.stop_id}'`
				}];

			}

			res.json(format(stopTime));
		}
	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/trips', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	var date = req.query.date;
	var dayOfWeek = dayOfWeekAsString(moment(date, 'YYYY-MM-DD').format('E'));

	var calendarQuery = { model: Calendar };
	var calendarDateQuery = { model: CalendarDate };

	if (date != undefined) {
		calendarQuery.where = {
			start_date : { lte: date },
			end_date : { gte: date }
		};
		calendarQuery.where[dayOfWeek] = 1;

		calendarDateQuery.where = { date: date, exception_type: 1 };
	}


	db.TripServices.query( (q) => q ).fetch({ withRelated: ['calendar'] }).then((trips) => {

		trips = trips.toJSON();

		trips.forEach((trip) => {

			if (trip.calendar != undefined) {

				trip.calendar.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}/calendars/${trip.service_id}`,
					"rel": "http://gtfs.helyx.io/api/calendar",
					"title": `Calendar '${trip.service_id}'`
				}];

				trip.calendar  = format(trip.calendar);
			}

			if (trip.calendarDates != undefined) {
				trip.calendarDates.forEach((calendarDate) => {

					calendarDate.links = [{
						"href": `${baseApiURL(req)}/agencies/${agencyId}/calendar-dates/${trip.service_id}`,
						"rel": "http://gtfs.helyx.io/api/calendar-date",
						"title": `Calendar date '${trip.service_id}'`
					}];

				});
				trip.calendarDates = format(trip.calendarDates);
			}

			trip.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}`,
				"rel": "http://gtfs.helyx.io/api/agency",
				"title": `Agency '${agencyId}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/trips/${trip.trip_id}`,
				"rel": "http://gtfs.helyx.io/api/trip",
				"title": `Trip '${trip.trip_id}'`
			}];

		});

		res.json(trips);

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/trips/:tripId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	var tripId = req.params.tripId;

	new db.TripService({ trip_id: tripId }).fetch({ withRelated: [ 'calendar' ]}).then((trip) => {

		if (!trip) {
			res.status(404).end();
		}
		else {
			trip = trip.toJSON();

			if (trip.calendar != undefined) {

				trip.calendar.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}/calendars/${trip.service_id}`,
					"rel": "http://gtfs.helyx.io/api/calendar",
					"title": `Calendar '${trip.service_id}'`
				}];

				trip.calendar = format(trip.calendar);
			}

			if (trip.calendarDates != undefined) {
				trip.calendarDates.forEach((calendarDate) => {

					calendarDate.links = [{
						"href": `${baseApiURL(req)}/agencies/${agencyId}/calendar-dates/${trip.service_id}`,
						"rel": "http://gtfs.helyx.io/api/calendar-date",
						"title": `Calendar date '${trip.service_id}'`
					}];

				});
			}

			trip.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/routes/${trip.route_id}`,
				"rel": "http://gtfs.helyx.io/api/route",
				"title": `Route '${trip.route_id}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/trips`,
				"rel": "http://gtfs.helyx.io/api/trips",
				"title": `Trips`
			}];

			res.json(format(trip));
		}
	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/stops', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	db.Stops.query( (q) => q.limit(1000) ).fetch().then((stops) => {

		if (withLinks(req)) {
			stops.forEach((stop) => {
				stop.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}`,
					"rel": "http://gtfs.helyx.io/api/agency",
					"title": `Agency '${agencyId}'`
				}, {
					"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${stop.stop_id}`,
					"rel": "http://gtfs.helyx.io/api/stop",
					"title": `Stop '${stop.stop_id}'`
				}];
			});
		}

		res.json(format(stops));

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/stops/:stopId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	var stopId = req.params.stopId;

	new db.Stop({ stop_id: stopId }).fetch().then((stop) => {

		if (!stop) {
			res.status(404).end();
		}
		else {

			stop = stop.toJSON();

			stop.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/stops`,
				"rel": "http://gtfs.helyx.io/api/stops",
				"title": `Stops`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${stopId}/stop-times`,
				"rel": "http://gtfs.helyx.io/api/stop-times",
				"title": `Stop times`
			}];

			res.json(format(stop));
		}

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/stops/:stopId/stop-times', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyId);

	var stopId = req.params.stopId;
//	var date = moment(req.params.date, 'YYYYMMDD');

	db.StopTimes.query( (q) => q.where({ stop_id: stopId }).limit(1000) ).fetch({ withRelated: ['stop'] }).then((stopTimes) => {

		stopTimes = stopTimes.toJSON();

		stopTimes.forEach((stopTime) => {

			stopTime.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/stop-times/${stopTime.stop_id}`,
				"rel": "http://gtfs.helyx.io/api/stop-time",
				"title": `Stoptime [Stop: '${stopTime.stop_id}' - Stop Name: '${stopTime.Stop.stop_name}' - Departure time: '${stopTime.Stop.departure_time}']`
			}];

			if (stopTime.stop) {

				stop.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${stopTime.stop_id}`,
					"rel": "http://gtfs.helyx.io/api/stop",
					"title": `Stop '${stopTime.stop_id}'`
				}];

			}

		});

		res.json(format(stopTimes));

	}).catch((err) => {
		logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
		res.status(500).json({message: err.message});
	});

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
