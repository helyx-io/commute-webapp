
var config = require('../conf/config');

var Knex = require('knex');
var Bookshelf = require('bookshelf');


var createSchemaConnection = function(agencyId) {

	var knex = Knex({
		debug: true,
		client: config.db.dialect,
		connection: {
			host     : config.db.host,
			user     : config.db.username,
			password : config.db.password,
			database : agencyId ? `${config.db.database}_${agencyId}` : config.db.database
		},
		pool: {
			min: config.db.min,
			max: config.db.max
		}
	});

	var bookshelf = Bookshelf(knex);

	var Agency = bookshelf.Model.extend({
		tableName: 'agencies',
		idAttribute: 'agency_id'
	});

	var Agencies = bookshelf.Collection.extend({
		model: Agency
	});

	var Calendar = bookshelf.Model.extend({
		tableName: 'calendars',
		idAttribute: 'service_id'
	});

	var Calendars = bookshelf.Collection.extend({
		model: Calendar
	});

	var CalendarDate = bookshelf.Model.extend({
		tableName: 'calendar_dates',
		idAttribute: 'service_id'
	});

	var CalendarDates = bookshelf.Collection.extend({
		model: CalendarDate
	});

	var StopTime = bookshelf.Model.extend({
		tableName: 'stop_times',
		idAttribute: 'stop_id',
		stop: function() {
			return this.hasOne(Stop, 'stop_id');
		}
	});

	var StopTimes = bookshelf.Collection.extend({
		model: StopTime
	});

	var Stop = bookshelf.Model.extend({
		tableName: 'stops',
		idAttribute: 'stop_id'
	});

	var Stops = bookshelf.Collection.extend({
		model: Stop
	});

	var Route = bookshelf.Model.extend({
		tableName: 'routes',
		idAttribute: 'route_id'
	});

	var Routes = bookshelf.Collection.extend({
		model: Route
	});

	var Station = bookshelf.Model.extend({
		tableName: 'stations',
		idAttribute: 'station_id'
	});

	var Stations = bookshelf.Collection.extend({
		model: Station
	});

	var Trip = bookshelf.Model.extend({
		tableName: 'trips',
		idAttribute: 'trip_id'
	});

	var Trips = bookshelf.Collection.extend({
		model: Trip
	});

	var TripService = bookshelf.Model.extend({
		tableName: 'trips',
		idAttribute: 'service_id',
		calendar: function() {
			return this.hasOne(Calendar, 'service_id');
		},
		calendarDates: function() {
			return this.hasMany(CalendarDate, 'service_id');
		}
	});

	var TripServices = bookshelf.Collection.extend({
		model: TripService
	});

	return {
		knex: knex,
		bookshelf: bookshelf,
		Agency: Agency,
		Agencies: Agencies,
		StopTime: StopTime,
		StopTimes: StopTimes,
		Stop: Stop,
		Stops: Stops,
		Route: Route,
		Routes: Routes,
		Station: Station,
		Stations: Stations,
		Trip: Trip,
		Trips: Trips,
		TripService: TripService,
		TripServices: TripServices,
		Calendar: Calendar,
		Calendars: Calendars,
		CalendarDate: CalendarDate,
		CalendarDates: CalendarDates
	};
};

var schemas = {
	gtfs: createSchemaConnection()
};

var schema = function (agencyId) {

	if (!schemas[agencyId]) {
		schemas[agencyId] = createSchemaConnection(agencyId);
	}

	return schemas[agencyId];
};

module.exports = {
	schema: schema
};


