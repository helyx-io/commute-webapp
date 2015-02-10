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


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router({mergeParams: true});


router.get('/', /*security.ensureJWTAuthenticated,*/ (req, res) => {

	var agencyKey = req.params.agencyKey;
	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyKey);

	db.Calendars.query( (q) => q ).fetch().then((calendars) => {

		calendars = calendars.toJSON();

		calendars.forEach((calendar) => {

			calendar.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyKey}`,
				"rel": "http://gtfs.helyx.io/api/agency",
				"title": `Calendar '${agencyKey}'`
			}, {
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/calendars/${calendar.service_id}`,
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

	var agencyKey = req.params.agencyKey;
	var agencyId = req.params.agencyId;
	var db = DB.schema(agencyKey);

	var serviceId = req.params.serviceId;

	new db.Calendar({service_id: serviceId}).fetch().then((calendar) => {

		if (!calendar) {
			res.status(404).end();
		}
		else {
			var calendar = calendar.toJSON();

			calendar.links = [{
				"href": `${baseApiURL(req)}/agencies/${agencyKey}/calendars`,
				"rel": "http://gtfs.helyx.io/api/calendars",
				"title": `Calendars`
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
