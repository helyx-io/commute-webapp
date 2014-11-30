"use strict";

module.exports = function(sequelize, DataTypes) {

	var AccessToken = sequelize.define("AccessToken", {
		token: DataTypes.STRING,
		userID: DataTypes.STRING,
		clientID: DataTypes.STRING,
		scope: DataTypes.STRING
	}, { tableName: "accessTokens" });

	return AccessToken;
};