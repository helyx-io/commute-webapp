////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var moment = require('moment');


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = function(sequelize, DataTypes) {

	return sequelize.define("CalendarDate", {
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
		date: {
			type: DataTypes.DATE,
			primaryKey: true
		},
		exception_type: DataTypes.INTEGER
	}, {
		tableName: "calendar_dates",
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

				newObj.date = moment(newObj.date).format("YYYY-MM-DD");

				return newObj;
			}
		},
		getterMethods: {
			createdAt: function() { return moment(this.getDataValue('createdAt')).format(); },
			updatedAt: function() { return moment(this.getDataValue('updatedAt')).format(); }
		}
	});
};