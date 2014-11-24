"use strict";

module.exports = function(sequelize, DataTypes) {

	var Client = sequelize.define("Client", {
		name: DataTypes.STRING,
		clientId: DataTypes.STRING,
		clientSecret: DataTypes.STRING
	}, { tableName: "clients" });

	return Client;
};