"use strict";

module.exports = function(sequelize, DataTypes) {

	var PemClient = sequelize.define("PemClient", {
		userId: DataTypes.INTEGER,
		privateKey: DataTypes.STRING(2048),
		certificate: DataTypes.STRING(2048),
		fingerprint: DataTypes.STRING(128),
		keyPassword: DataTypes.STRING(128),
		certPassword: DataTypes.STRING(128),
		days: DataTypes.INTEGER
	}, {
		tableName: "pemClients"
	});

	return PemClient;
};