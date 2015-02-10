////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');
var util = require('util');

var logger = require('../log/logger');
var DB = require('../lib/db');


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var findAgencies = () => {

	var db = DB.schema('gtfs');

	return db.Agencies.query( (q) => q ).fetch().then((agencies) => {

		return agencies.toJSON();
	});
};

var findNearestAgencies = (position) => {

	var db = DB.schema('gtfs');

	return db.Agencies.query( (q) => {
		return q
			.where('agency_min_lat', '<=', position.lat)
			.andWhere('agency_max_lat', '>=', position.lat)
			.andWhere('agency_min_lon', '<=', position.lon)
			.andWhere('agency_max_lon', '>=', position.lon)
	}).fetch().then((agencies) => {
		return agencies.toJSON();
	});
};


var findAgencyByKey = (agencyKey) => {

	var db = DB.schema('gtfs');

	return new db.Agency({ agency_key: agencyKey }).fetch().then((agency) => {

		if (!agency) {
			return undefined;
		}
		else {
			return agency.toJSON();
		}
	});

};


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	findAgencies: findAgencies,
	findNearestAgencies: findNearestAgencies,
	findAgencyByKey: findAgencyByKey
};

