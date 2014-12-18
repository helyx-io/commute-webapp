////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');

var express = require('express');
var passport = require('passport');

var moment = require('moment');

var util = require('util');

var modulePackage = require('../package.json');

var security = require('../lib/security');
var models = require('../models');

var logger = require('../log/logger');

var _ = require('lodash');

var db = require('../lib/db');

var Agency = models.Agency;
var Route = models.Route;
var Trip = models.Trip;
var TripService = models.TripService;
var Stop = models.Stop;
var StopTime = models.StopTime;
var Calendar = models.Calendar;
var CalendarDate = models.CalendarDate;

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

router.get('/', (req, res) => {
	res.json({version: modulePackage.version});
});

router.get('/agencies', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	db('agencies').then((agencies) => {
		var agencies = agencies.map((agency) => {

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

			return agency;
		});

		res.json(format(agencies));
	}).catch((err) => {
			res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;

	db('agencies').where({ agency_id: agencyId }).then((agencies) => {

		if (agencies.length == 0) {
			res.status(404).end();
		}
		else {
			var agency = agencies[0];

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
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/routes', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;

	db('routes').where({agency_id: agencyId}).then((routes) => {

		routes = routes.map((route) => {

			route.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}`,
				"rel": "http://gtfs.helyx.io/api/agency",
				"title": `Agency '${agencyId}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/routes/${route.route_id}`,
				"rel": "http://gtfs.helyx.io/api/route",
				"title": `Route '${route.route_id}'`
			}];

			return route;
		});

		res.json(format(routes));

	}).catch((err) => {
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/routes/:routeId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var routeId = req.params.routeId;

	db('routes').where({agency_id: agencyId, route_id: routeId}).then((routes) => {

		if (routes.length == 0) {
			res.status(404).end();
		}
		else {
			var route = routes[0];

			route.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/routes`,
				"rel": "http://gtfs.helyx.io/api/routes",
				"title": `Routes`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/routes/${routeId}/trips`,
				"rel": "http://gtfs.helyx.io/api/trips",
				"title": `Trips`
			}];

			res.json(route);
		}

	}).catch((err) => {
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/routes/:routeId/trips', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
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

//		calendarDateQuery.where = { date: date, exception_type: 1 };
	}


	TripService.findAll({where: {route_id: routeId}, include: [calendarQuery]}).complete((err, calendarTrips) => {
		TripService.findAll({where: {route_id: routeId}, include: [calendarDateQuery]}).complete((err, calendarDateTrips) => {

			var trips = calendarTrips.map((calendarTrip) => {
				var calendarDateTrip = calendarDateTrips.find((calendarDateTrip) => calendarTrip.trip_id == calendarDateTrip.trip_id) || {};
				calendarTrip.CalendarDates = calendarDateTrip.CalendarDates || [];
				return calendarTrip;
			});

			if (err) {
				res.status(500).json({message: err.message});
			}
			else {
				trips = trips.map((trip) => {
					var jsonTrip = trip.toJSON();

					if (trip.Calendar != undefined) {
						var jsonCalendar = trip.Calendar.toJSON();

						jsonCalendar.links = [{
							"href": `${baseApiURL(req)}/agencies/${agencyId}/calendars/${jsonTrip.service_id}`,
							"rel": "http://gtfs.helyx.io/api/calendar",
							"title": `Calendar '${jsonTrip.service_id}'`
						}];

						jsonTrip.calendar = jsonCalendar;
					}

					if (trip.CalendarDates != undefined) {
						var jsonCalendarDates = trip.CalendarDates.map((calendarDate) => {
							var jsonCalendarDate = calendarDate.toJSON();

							jsonCalendarDate.links = [{
								"href": `${baseApiURL(req)}/agencies/${agencyId}/calendar-dates/${jsonTrip.service_id}`,
								"rel": "http://gtfs.helyx.io/api/calendar-date",
								"title": `Calendar date '${jsonTrip.service_id}'`
							}];

							return jsonCalendarDate;
						});
						jsonTrip.calendarDates = jsonCalendarDates;
					}

					jsonTrip.links = [{
						"href": `${baseApiURL(req)}/agencies/${agencyId}/routes/${routeId}`,
						"rel": "http://gtfs.helyx.io/api/route",
						"title": `Route '${routeId}'`
					}, {
						"href": `${baseApiURL(req)}/agencies/${agencyId}/trips/${trip.trip_id}`,
						"rel": "http://gtfs.helyx.io/api/trip",
						"title": `Trip '${trip.trip_id}'`
					}];

					return jsonTrip;
				});
				res.json(trips);
			}
		});
	});

});


router.get('/agencies/:agencyId/calendars', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;

	db('calendars').then((calendars) => {

		calendars = calendars.map((calendar) => {
			calendar.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}`,
				"rel": "http://gtfs.helyx.io/api/agency",
				"title": `Calendar '${agencyId}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/calendars/${calendar.service_id}`,
				"rel": "http://gtfs.helyx.io/api/calendar",
				"title": `Calendar '${calendar.service_id}'`
			}];

			return calendar;
		});
		res.json(format(calendars));

	}).catch((err) => {
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/calendars/:serviceId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var serviceId = req.params.serviceId;

	db('calendars').where({service_id: serviceId}).then((calendars) => {


		if (calendars.length == 0) {
			res.status(404).end();
		}
		else {
			var calendar = calendars[0];

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
		res.status(500).json({message: err.message});
	});

});


router.get('/agencies/:agencyId/calendar-dates/:serviceId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var serviceId = req.params.serviceId;

	CalendarDate.findAll({where: { service_id: serviceId }}).complete((err, calendarDates) => {

		if (err) {
			logger.error(`[ERROR] Message: ${err.message} - ${err.stack}`);
			res.status(500).json({message: err.message});
		}
		else {
			calendarDates = calendarDates.map((calendarDate) => {
				var jsonCalendar = calendarDate.toJSON();

				jsonCalendar.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}/calendars/${serviceId}`,
					"rel": "http://gtfs.helyx.io/api/calendar",
					"title": `Calendar '${serviceId}'`
				}, {
					"href": `${baseApiURL(req)}/agencies/${agencyId}/calendar-dates/${serviceId}/${moment(calendarDate.date).format('YYYY-MM-DD')}`,
					"rel": "http://gtfs.helyx.io/api/calendar-date",
					"title": `Calendar date '${moment(calendarDate.date).format('YYYY-MM-DD')}'`
				}];

				return jsonCalendar;
			});
			res.json(calendarDates);
		}
	});

});


router.get('/agencies/:agencyId/calendar-dates/:serviceId/:date', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var serviceId = req.params.serviceId;
	var date = req.params.date;

	CalendarDate.find({where: {service_id: serviceId, date: date }}).complete((err, calendarDate) => {

		if (err) {
			res.status(500).json({message: err.message});
		}
		else {
			var jsonCalendarDate = calendarDate.toJSON();

			jsonCalendarDate.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/calendar-dates/${serviceId}`,
				"rel": "http://gtfs.helyx.io/api/calendar-dates",
				"title": `Calendar dates`
			}];

			res.json(jsonCalendarDate);
		}
	});

});


router.get('/agencies/:agencyId/trips/:tripId/stop-times', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var tripId = req.params.tripId;

	StopTime.findAll({where: {trip_id: tripId}, limit: 1000, include: [ Stop ]}).complete((err, stopTimes) => {

		if (err) {
			res.status(500).json({message: err.message});
		}
		else {
			stopTimes = stopTimes.map((stopTime) => {
				var jsonStopTime = stopTime.toJSON();
				var jsonStop = stopTime.Stop.toJSON();
				jsonStopTime.stop = jsonStop;
				jsonStopTime.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}/trips/${tripId}`,
					"rel": "http://gtfs.helyx.io/api/trip",
					"title": `Trip '${tripId}'`
				}, {
					"href": `${baseApiURL(req)}/agencies/${agencyId}/stop-times/${stopTime.stop_id}`,
					"rel": "http://gtfs.helyx.io/api/stop-time",
					"title": `Stoptime [Stop: '${stopTime.stop_id}' - Stop Name: '${stopTime.Stop.stop_name}' - Departure time: '${stopTime.Stop.departure_time}']`
				}, {
					"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${stopTime.stop_id}`,
					"rel": "http://gtfs.helyx.io/api/stop",
					"title": `Stop '${stopTime.stop_id}'`
				}];

				return jsonStopTime;
			});
			res.json(stopTimes);
		}
	});

});


router.get('/agencies/:agencyId/stop-times/:stopId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var stopId = req.params.stopId;

	StopTime.find({where: {stop_id: stopId}, include: [ Stop ]}).complete((err, stopTime) => {

		if (err) {
			res.status(500).json({message: err.message});
		}
		else {
			var jsonStopTime = stopTime.toJSON();
			var jsonStop = stopTime.Stop.toJSON();
			jsonStopTime.stop = jsonStop;
			jsonStopTime.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/trips/${stopTime.trip_id}`,
				"rel": "http://gtfs.helyx.io/api/trip",
				"title": `Trip '${stopTime.trip_id}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${stopTime.stop_id}`,
				"rel": "http://gtfs.helyx.io/api/stop",
				"title": `Stop '${stopTime.stop_id}'`
			}];

			res.json(jsonStopTime);
		}
	});

});


router.get('/agencies/:agencyId/trips', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
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

//		calendarDateQuery.where = { date: date, exception_type: 1 };
	}


	TripService.findAll({ limit: 1000, include: [ calendarQuery, calendarDateQuery ] }).complete((err, trips) => {

		if (err) {
			res.status(500).json({ message: err.message });
		}
		else {
			trips = trips.map((trip) => {
				var jsonTrip = trip.toJSON();

				if (trip.Calendar != undefined) {
					var jsonCalendar = trip.Calendar.toJSON();

					jsonCalendar.links = [{
						"href": `${baseApiURL(req)}/agencies/${agencyId}/calendars/${jsonTrip.service_id}`,
						"rel": "http://gtfs.helyx.io/api/calendar",
						"title": `Calendar '${jsonTrip.service_id}'`
					}];

					jsonTrip.calendar = jsonCalendar;
				}

				if (trip.CalendarDates != undefined) {
					var jsonCalendarDates = trip.CalendarDates.map((calendarDate) => {
						var jsonCalendarDate = calendarDate.toJSON();

						jsonCalendarDate.links = [{
							"href": `${baseApiURL(req)}/agencies/${agencyId}/calendar-dates/${jsonTrip.service_id}`,
							"rel": "http://gtfs.helyx.io/api/calendar-date",
							"title": `Calendar date '${jsonTrip.service_id}'`
						}];

						return jsonCalendarDate;
					});
					jsonTrip.calendarDates = jsonCalendarDates;
				}

				jsonTrip.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}`,
					"rel": "http://gtfs.helyx.io/api/agency",
					"title": `Agency '${agencyId}'`
				}, {
					"href": `${baseApiURL(req)}/agencies/${agencyId}/trips/${jsonTrip.trip_id}`,
					"rel": "http://gtfs.helyx.io/api/trip",
					"title": `Trip '${jsonTrip.trip_id}'`
				}];

				return jsonTrip;
			});
			res.json(trips);
		}
	});

});


router.get('/agencies/:agencyId/trips/:tripId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var tripId = req.params.tripId;

	TripService.find({ where:{ trip_id: tripId }, include: [ Calendar, CalendarDate ]}).complete((err, trip) => {

		if (err) {
			res.status(500).json({ message: err.message });
		}
		else {
			var jsonTrip = trip.toJSON();

			if (trip.Calendar != undefined) {
				var jsonCalendar = trip.Calendar.toJSON();

				jsonCalendar.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}/calendars/${jsonTrip.service_id}`,
					"rel": "http://gtfs.helyx.io/api/calendar",
					"title": `Calendar '${jsonTrip.service_id}'`
				}];

				jsonTrip.calendar = jsonCalendar;
			}

			if (trip.CalendarDates != undefined) {
				var jsonCalendarDates = trip.CalendarDates.map((calendarDate) => {
					var jsonCalendarDate = calendarDate.toJSON();

					jsonCalendarDate.links = [{
						"href": `${baseApiURL(req)}/agencies/${agencyId}/calendar-dates/${jsonTrip.service_id}`,
						"rel": "http://gtfs.helyx.io/api/calendar-date",
						"title": `Calendar date '${jsonTrip.service_id}'`
					}];

					return jsonCalendarDate;
				});
				jsonTrip.calendarDates = jsonCalendarDates;
			}

			jsonTrip.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/routes/${trip.route_id}`,
				"rel": "http://gtfs.helyx.io/api/route",
				"title": `Route '${trip.route_id}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/trips`,
				"rel": "http://gtfs.helyx.io/api/trips",
				"title": `Trips`
			}];

			res.json(jsonTrip);
		}
	});

});


router.get('/agencies/:agencyId/stops', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;

	Stop.findAll({ limit: 1000 }).complete((err, stops) => {

		if (err) {
			res.status(500).json({ message: err.message });
		}
		else {
			stops = stops.map((stop) => {
				var jsonStop = stop.toJSON();

				jsonStop.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}`,
					"rel": "http://gtfs.helyx.io/api/agency",
					"title": `Agency '${agencyId}'`
				}, {
					"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${jsonStop.stop_id}`,
					"rel": "http://gtfs.helyx.io/api/stop",
					"title": `Stop '${jsonStop.stop_id}'`
				}];

				return jsonStop;
			});

			res.json(stops);
		}
	});

});


router.get('/agencies/:agencyId/stops/:stopId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var stopId = req.params.stopId;

	Stop.find({ where:{ stop_id: stopId } }).complete((err, stop) => {

		if (err) {
			res.status(500).json({ message: err.message });
		}
		else {
			var jsonStop = stop.toJSON();

			jsonStop.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/stops`,
				"rel": "http://gtfs.helyx.io/api/stops",
				"title": `Stops`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${stopId}/stop-times`,
				"rel": "http://gtfs.helyx.io/api/stop-times",
				"title": `Stop times`
			}];

			res.json(jsonStop);
		}
	});

});


router.get('/agencies/:agencyId/stops/:stopId/stop-times', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var stopId = req.params.stopId;
//	var date = moment(req.params.date, 'YYYYMMDD');

	StopTime.findAll({where: {stop_id: stopId}, limit: 1000, include: [ Stop ]}).complete((err, stopTimes) => {

		if (err) {
			res.status(500).json({message: err.message});
		}
		else {
			stopTimes = stopTimes.map((stopTime) => {
				var jsonStopTime = stopTime.toJSON();
				var jsonStop = stopTime.Stop.toJSON();
				jsonStopTime.stop = jsonStop;
				jsonStopTime.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}/stop-times/${stopTime.stop_id}`,
					"rel": "http://gtfs.helyx.io/api/stop-time",
					"title": `Stoptime [Stop: '${stopTime.stop_id}' - Stop Name: '${stopTime.Stop.stop_name}' - Departure time: '${stopTime.Stop.departure_time}']`
				}, {
					"href": `${baseApiURL(req)}/agencies/${agencyId}/stops/${stopTime.stop_id}`,
					"rel": "http://gtfs.helyx.io/api/stop",
					"title": `Stop '${stopTime.stop_id}'`
				}];

				return jsonStopTime;
			});
			res.json(stopTimes);
		}
	});

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
