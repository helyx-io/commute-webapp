////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var moment = require('moment');


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = function(sequelize, DataTypes) {

	return sequelize.define("Stop", {
		agency_key: DataTypes.STRING,
		stop_id: DataTypes.STRING,
		stop_name: DataTypes.STRING,
		stop_desc: DataTypes.STRING,
		stop_lat: DataTypes.STRING,
		stop_lon: DataTypes.STRING,
		zone_id: DataTypes.INTEGER,
		stop_url: DataTypes.STRING,
		location_type: DataTypes.STRING,
		parent_station: DataTypes.STRING
	}, {
		tableName: "stops",
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