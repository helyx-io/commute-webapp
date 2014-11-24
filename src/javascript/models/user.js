"use strict";

module.exports = function(sequelize, DataTypes) {

	//user.firstName = profile.name.givenName;
	//user.lastName = profile.name.familyName;
	//user.gender = profile._json.gender;
	//user.googleId = profile.id;
	//user.avatarUrl = profile._json.picture ? profile._json.picture : "images/avatar_placeholder.png";
	//user.role = _.some(config.auth.admin, profile.emails[0].value) ? "ROLE_ADMIN" : "ROLE_USER";

	var User = sequelize.define("User", {
		firstName: DataTypes.STRING,
		lastName: DataTypes.STRING,
		gender: DataTypes.STRING,
		email: DataTypes.STRING,
		googleId: DataTypes.STRING,
		avatarUrl: DataTypes.STRING,
		role: DataTypes.STRING
	}, {
		tableName: "users"
	});

	return User;
};