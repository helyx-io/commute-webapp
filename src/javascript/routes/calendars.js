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


router.get('/', /*security.ensureJWTAuthenticated,*/ (req, res) => {

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


router.get('/:serviceId', /*security.ensureJWTAuthenticated,*/ (req, res) => {

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


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
