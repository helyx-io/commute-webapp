////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var moment = require('moment');


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = function(sequelize, DataTypes) {

	return sequelize.define("StopTime", {
		agency_key: DataTypes.STRING,
		trip_id: DataTypes.STRING,
		arrival_time: DataTypes.STRING,
		departure_time: DataTypes.STRING,
		stop_id: DataTypes.STRING,
		stop_sequence: DataTypes.STRING,
		stop_head_sign: DataTypes.INTEGER,
		pickup_type: DataTypes.STRING,
		drop_off_type: DataTypes.STRING
	}, {
		tableName: "stop_times",
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