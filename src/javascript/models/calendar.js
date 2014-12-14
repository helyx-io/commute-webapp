////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var moment = require('moment');


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = function(sequelize, DataTypes) {

	return sequelize.define("Calendar", {
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			unique: true,
			allowNull: false
		},
		agency_key: DataTypes.STRING(45),
		service_id: {
			type: DataTypes.INTEGER,
			primaryKey: true
		},
		monday: DataTypes.BOOLEAN,
		tuesday: DataTypes.BOOLEAN,
		wednesday: DataTypes.BOOLEAN,
		thursday: DataTypes.BOOLEAN,
		friday: DataTypes.BOOLEAN,
		saturday: DataTypes.BOOLEAN,
		sunday: DataTypes.BOOLEAN,
		start_date: DataTypes.DATE,
		end_date: DataTypes.DATE
	}, {
		tableName: "calendars",
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