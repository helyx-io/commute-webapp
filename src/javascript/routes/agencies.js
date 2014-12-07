////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var express = require('express');
var moment = require('moment');

var logger = require('../log/logger');

var security = require('../lib/security');

var models = require('../models');
var Agency = models.Agency;
var Route = models.Route;
var Trip = models.Trip
var Stop = models.Stop
var StopTime = models.StopTime


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router();

router.get('/', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	Agency.findAll({}).complete((err, agencies) => {

		if (err) {
			res.json(500, {message: err.message});
		}
		else {
			agencies = agencies.map((agency) => {
				return agency.toJSON();
			});
			res.json(agencies);
		}
	});

});

router.get('/:agencyId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;

	Agency.find({where: {agency_id: agencyId}}).complete((err, agency) => {

		if (err) {
			res.json(500, {message: err.message});
		}
		else {
			res.json(agency.toJSON());
		}
	});

});


router.get('/:agencyId/routes', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;

	Route.findAll({where: {agency_id: agencyId}}).complete((err, routes) => {

		if (err) {
			res.json(500, {message: err.message});
		}
		else {
			routes = routes.map((route) => {
				return route.toJSON();
			});
			res.json(routes);
		}
	});

});


router.get('/:agencyId/routes/:routeId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyId = req.params.agencyId;
	var routeId = req.params.routeId;

	Route.find({where: {agency_id: agencyId, route_id: routeId}}).complete((err, route) => {

		if (err) {
			res.json(500, {message: err.message});
		}
		else {
			res.json(route.toJSON());
		}
	});

});


router.get('/:agencyId/routes/:routeId/trips', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var routeId = req.params.routeId;

	Trip.findAll({where: {route_id: routeId}}).complete((err, trips) => {

		if (err) {
			res.json(500, {message: err.message});
		}
		else {
			trips = trips.map((trip) => {
				return trip.toJSON();
			});
			res.json(trips);
		}
	});

});


router.get('/:agencyId/routes/:routeId/trips/:tripId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var routeId = req.params.routeId;
	var tripId = req.params.tripId;

	Trip.find({where: {route_id: routeId, trip_id: tripId}}).complete((err, trip) => {

		if (err) {
			res.json(500, {message: err.message});
		}
		else {
			res.json(trip.toJSON());
		}
	});

});


router.get('/:agencyId/routes/:routeId/trips/:tripId/stoptimes', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var tripId = req.params.tripId;

	StopTime.findAll({where: {trip_id: tripId}, limit: 1000}).complete((err, stopTimes) => {

		if (err) {
			res.json(500, {message: err.message});
		}
		else {
			stopTimes = stopTimes.map((stopTime) => {
				var jsonStopTime = stopTime.toJSON();
				jsonStopTime.links = [{
					"href": `${req.headers["x-forwarded-proto"] || req.protocol}://${req.host}/api/stops/${stopTime.stop_id}`,
					"rel": "http://gtfs.helyx.io/api/stop",
					"title": stopTime.stop_id
				}];
				return jsonStopTime;
			});
			res.json(stopTimes);
		}
	});

});


router.get('/:agencyId/routes/:routeId/trips/:tripId/stoptimes/:stopId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var stopId = req.params.stopId;

	StopTime.find({where: {stop_id: stopId}}).complete((err, stopTimes) => {

		if (err) {
			res.json(500, {message: err.message});
		}
		else {
			res.json(stopTimes.toJSON());
		}
	});

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
