////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var express = require('express');

var agencies = require('./agencies');
var calendars = require('./calendars');
var calendarDates = require('./calendarDates');
var routes = require('./routes');
var stations = require('./stations');
var stops = require('./stops');
var stopTimes = require('./stopTimes');
var stopTimesFull = require('./stopTimesFull');
var trips = require('./trips');


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router();

router.use('/agencies/:agencyId/agencies', agencies);
router.use('/agencies/:agencyId/calendars', calendars);
router.use('/agencies/:agencyId/calendarDates', calendarDates);
router.use('/agencies/:agencyId/routes', routes);
router.use('/agencies/:agencyId/stations', stations);
router.use('/agencies/:agencyId/stops', stops);
router.use('/agencies/:agencyId/stop-times', stopTimes);
router.use('/agencies/:agencyId/stop-times-full', stopTimesFull);
router.use('/agencies/:agencyId/trips', trips);


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
