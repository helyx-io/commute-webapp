////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var moment = require('moment');


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = function(sequelize, DataTypes) {

	return sequelize.define("Agency", {
		agency_key: DataTypes.STRING(45),
		agency_id: {
			type: DataTypes.STRING(45),
			primaryKey: true
		},
		agency_name: DataTypes.STRING(45),
		agency_url: DataTypes.STRING(45),
		agency_timezone: DataTypes.STRING(45),
		agency_lang: DataTypes.STRING(45)
	}, {
		tableName: "agencies",
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