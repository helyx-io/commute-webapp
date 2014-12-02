"use strict";

module.exports = function(sequelize, DataTypes) {

	var Agency = sequelize.define("Agency", {
		agency_key: DataTypes.STRING,
		agency_id: DataTypes.STRING,
		agency_name: DataTypes.STRING,
		agency_url: DataTypes.STRING,
		agency_timezone: DataTypes.STRING,
		agency_lang: DataTypes.STRING
	}, {
		tableName: "agencies"
	});

	return Agency;
};