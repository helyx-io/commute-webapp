////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var moment = require('moment');


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = function(sequelize, DataTypes) {

	return sequelize.define("TripService", {
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			unique: true,
			allowNull: false
		},
		agency_key: DataTypes.STRING(45),
		route_id: DataTypes.STRING(45),
		service_id:{
			type: DataTypes.INTEGER,
			primaryKey: true
		},
		trip_id: {
			type: DataTypes.STRING(45)
		},
		trip_headsign: DataTypes.STRING(45),
		direction_id: DataTypes.INTEGER,
		block_id: DataTypes.STRING(45),
		shape_id: DataTypes.STRING(45)
	}, {
		tableName: "trips",
		underscored: true,
		instanceMethods: {
			toJSON: function() {
				var obj = this.get({ plain: true });
				var newObj = {};
				var attributes = this.options.attributes || this.attributes;
				var length = attributes.length;
				for (var i = 0; i < length; i++) {
					newObj[attributes[i]] = obj[attributes[i]];
				}

				return newObj;
			}
		},
		getterMethods: {
			createdAt: function() { return moment(this.getDataValue('createdAt')).format(); },
			updatedAt: function() { return moment(this.getDataValue('updatedAt')).format(); }
		}
	});

};