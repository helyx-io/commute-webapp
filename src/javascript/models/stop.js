////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var moment = require('moment');


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = function(sequelize, DataTypes) {

	return sequelize.define("Stop", {
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			unique: true,
			allowNull: false
		},
		agency_key: DataTypes.STRING(45),
		stop_id: {
			type: DataTypes.STRING(45),
			primaryKey: true
		},
		stop_name: DataTypes.STRING(64),
		stop_desc: DataTypes.STRING(128),
		stop_lat: DataTypes.INTEGER,
		stop_lon: DataTypes.INTEGER,
		zone_id: DataTypes.STRING(45),
		stop_url: DataTypes.STRING(45),
		location_type: DataTypes.INTEGER,
		parent_station: DataTypes.STRING(45)
	}, {
		tableName: "stops",
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