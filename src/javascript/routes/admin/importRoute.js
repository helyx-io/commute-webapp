////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var express = require('express');

var logger = require('../../lib/logger');
var passport = require('passport');

var importService = require('../../services/importService');


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router({mergeParams: true});

router.get('/users', passport.authenticate('basic', { session: false }), (req, res) => {
	importService.importUsers().then(() => {
		res.status(200).end();
	}).catch((err) => {
		res.status(500).end();
	});
});

// catch 404 and forward to error handler
router.use((req, res, next) => {
	var err = new Error('IMPORT - Not Found');
	err.status = 404;
	next(err);
});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;