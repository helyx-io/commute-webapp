'use strict';
var DB = require('../lib/db');
var activityStream = require('../lib/activityStream');

var activityService = {
    getAll: function () {
        return DB.knex("activities").orderBy('published', 'desc').limit(30)
            .map(activity => activityStream.activity().fromModel(activity).get());
    }
};

module.exports = activityService;