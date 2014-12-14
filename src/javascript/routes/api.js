////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');

var express = require('express');
var passport = require('passport');

var moment = require('moment');

var modulePackage = require('../package.json');

var security = require('../lib/security');
var models = require('../models');

var logger = require('../log/logger');

var Agency = models.Agency;
var Route = models.Route;
var Trip = models.Trip;
var TripService = models.TripService;
var Stop = models.Stop;
var StopTime = models.StopTime;
var Calendar = models.Calendar;
var CalendarDate = models.CalendarDate;


////////////////////////////////////////////////////////////////////////////////////
// Helper functions
////////////////////////////////////////////////////////////////////////////////////

var baseApiURL = function(req) {
	return `${req.headers["x-forwarded-proto"] || req.protocol}://${req.host}/api`;
};


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router();

router.get('/', (req, res) => {
	res.json({version: modulePackage.version});
});


router.get('/agencies', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	Agency.findAll({}).complete((err, agencies) => {

		if (err) {
			res.json(500, {message: err.message});
		}
		else {
			agencies = agencies.map((agency) => {
				var jsonAgency = agency.toJSON();

				jsonAgency.links = [{
					"href": `${baseApiURL(req)}/agencies/${agency.agency_id}`,
					"rel": "http://gtfs.helyx.io/api/agency",
					"title": `Agency '${agency.agency_id}'`
				}];

				return jsonAgency;
			});
			res.json(agencies);
		}
	});

});


router.get('/agencies/:agencyId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;

	Agency.find({where: {agency_id: agencyId}}).complete((err, agency) => {

		if (err) {
			res.json(500, {message: err.message});
		}
		else {
			var jsonAgency = agency.toJSON();

			jsonAgency.links = [{
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

			res.json(jsonAgency);
		}
	});

});


router.get('/agencies/:agencyId/routes', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;

	Route.findAll({where: {agency_id: agencyId}}).complete((err, routes) => {

		if (err) {
			res.json(500, {message: err.message});
		}
		else {
			routes = routes.map((route) => {
				var jsonRoute = route.toJSON();

				jsonRoute.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}`,
					"rel": "http://gtfs.helyx.io/api/agency",
					"title": `Agency '${agencyId}'`
				}, {
					"href": `${baseApiURL(req)}/agencies/${agencyId}/routes/${jsonRoute.route_id}`,
					"rel": "http://gtfs.helyx.io/api/route",
					"title": `Route '${jsonRoute.route_id}'`
				}];

				return jsonRoute;
			});
			res.json(routes);
		}
	});

});


router.get('/agencies/:agencyId/routes/:routeId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var routeId = req.params.routeId;

	Route.find({where: {agency_id: agencyId, route_id: routeId}}).complete((err, route) => {

		if (err) {
			res.json(500, {message: err.message});
		}
		else {
			var jsonRoute = route.toJSON();

			jsonRoute.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/routes`,
				"rel": "http://gtfs.helyx.io/api/routes",
				"title": `Routes`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/routes/${routeId}/trips`,
				"rel": "http://gtfs.helyx.io/api/trips",
				"title": `Trips`
			}];

			res.json(jsonRoute);
		}
	});

});


router.get('/agencies/:agencyId/routes/:routeId/trips', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var routeId = req.params.routeId;

	Trip.findAll({where: {route_id: routeId}}).complete((err, trips) => {

		if (err) {
			res.json(500, {message: err.message});
		}
		else {
			trips = trips.map((trip) => {
				var jsonTrip = trip.toJSON();

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


router.get('/agencies/:agencyId/calendars', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;

	Calendar.findAll({where: {}}).complete((err, calendars) => {

		if (err) {
			res.json(500, {message: err.message});
		}
		else {
			calendars = calendars.map((calendar) => {
				var jsonCalendar = calendar.toJSON();

				jsonCalendar.links = [{
					"href": `${baseApiURL(req)}/agencies/${agencyId}`,
					"rel": "http://gtfs.helyx.io/api/agency",
					"title": `Calendar '${agencyId}'`
				}, {
					"href": `${baseApiURL(req)}/agencies/${agencyId}/calendars/${calendar.service_id}`,
					"rel": "http://gtfs.helyx.io/api/calendar",
					"title": `Calendar '${calendar.service_id}'`
				}];

				return jsonCalendar;
			});
			res.json(calendars);
		}
	});

});


router.get('/agencies/:agencyId/calendars/:serviceId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var serviceId = req.params.serviceId;

	Calendar.find({where: {service_id: serviceId}}).complete((err, calendar) => {

		if (err) {
			res.json(500, {message: err.message});
		}
		else {
			var jsonCalendar = calendar.toJSON();

			jsonCalendar.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyId}/calendars`,
				"rel": "http://gtfs.helyx.io/api/calendars",
				"title": `Calendars`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyId}/calendar-dates/${serviceId}`,
				"rel": "http://gtfs.helyx.io/api/calendar-dates",
				"title": `Calendar dates`
			}];

			res.json(jsonCalendar);
		}
	});

});


router.get('/agencies/:agencyId/calendar-dates/:serviceId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var serviceId = req.params.serviceId;

	CalendarDate.findAll({where: { service_id: serviceId }}).complete((err, calendarDates) => {

		if (err) {
			res.json(500, {message: err.message});
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
			res.json(500, {message: err.message});
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
			res.json(500, {message: err.message});
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
			res.json(500, {message: err.message});
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

	Trip.findAll({ limit: 1000 }).complete((err, trips) => {

		if (err) {
			res.json(500, { message: err.message });
		}
		else {
			trips = trips.map((trip) => {
				var jsonTrip = trip.toJSON();

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
			res.json(500, { message: err.message });
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
			res.json(500, { message: err.message });
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
			res.json(500, { message: err.message });
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
			res.json(500, {message: err.message});
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
