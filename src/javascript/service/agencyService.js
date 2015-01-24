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

var findMatchingAgencyByPosition = (position) => {

	var db = DB.schema('gtfs');

	return db.Agency.query( (q) => {
		return q
			.where('agency_min_lat', '<=', position.lat)
			.andWhere('agency_max_lat', '>=', position.lat)
			.andWhere('agency_min_lon', '<=', position.lon)
			.andWhere('agency_max_lon', '>=', position.lon)
	}).fetch().then((agency) => {

		return agency.toJSON();
	});
};


var findAgencyById = (agencyId) => {

	var db = DB.schema('gtfs');

	return new db.Agency({ agency_id: agencyId }).fetch().then((agency) => {

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
	findMatchingAgencyByPosition: findMatchingAgencyByPosition,
	findAgencyById: findAgencyById
};

