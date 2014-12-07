////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var moment = require('moment');


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = function(sequelize, DataTypes) {

	return sequelize.define("Trip", {
		agency_key: DataTypes.STRING,
		route_id: DataTypes.STRING,
		service_id: DataTypes.STRING,
		trip_id: DataTypes.STRING,
		trip_headsign: DataTypes.STRING,
		direction_id: DataTypes.STRING,
		block_id: DataTypes.INTEGER,
		shape_id: DataTypes.STRING
	}, {
		tableName: "trips",
		underscored: true,
		instanceMethods: {
			toJSON: function() {
				var obj = this.get({ plain: true });
				var newObj = {};
				var length = this.options.attributes.length;
				for (var i = 0; i < length; i++) {
					newObj[this.options.attributes[i]] = obj[this.options.attributes[i]];
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