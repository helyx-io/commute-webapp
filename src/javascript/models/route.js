////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var moment = require('moment');


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = function(sequelize, DataTypes) {

	return sequelize.define("Route", {
		agency_key: DataTypes.STRING,
		route_id: DataTypes.STRING,
		agency_id: DataTypes.STRING,
		route_short_name: DataTypes.STRING,
		route_long_name: DataTypes.STRING,
		route_desc: DataTypes.STRING,
		route_type: DataTypes.INTEGER,
		route_url: DataTypes.STRING,
		route_color: DataTypes.STRING,
		route_text_color: DataTypes.STRING
	}, {
		tableName: "routes",
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