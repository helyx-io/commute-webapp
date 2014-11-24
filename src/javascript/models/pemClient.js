"use strict";

module.exports = function(sequelize, DataTypes) {

	var PemClient = sequelize.define("PemClient", {
		userId: DataTypes.INTEGER,
		privateKey: DataTypes.STRING(2048),
		certificate: DataTypes.STRING(2048)
	}, {
		tableName: "pemClients"
	});

	return PemClient;
};