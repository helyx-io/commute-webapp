'use strict';

////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');
var util = require('util');

var express = require('express');
var passport = require('passport');

var DB = require('../lib/db');

var activityStream = require('../lib/activityStream');

var logger = require('../lib/logger');
var security = require('../lib/security');

var config = require('../conf/config');
var activityService = require('../services/activityService');


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router({mergeParams: true});

router.get('/', security.ensureAuthenticated, (req, res) => {

    activityService.getAll().then(function (activities) {
        if (!activities) {
            res.sendStatus(404);
        }
        res.status(200).json(activities);
    }, function (error) {
        logger.error(("Failed to get activities: " + (error.message || error) + " - Stack: " + error.stack));
        res.status(500).end();
    })
});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
