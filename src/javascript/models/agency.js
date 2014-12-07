////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var moment = require('moment');


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = function(sequelize, DataTypes) {

	return sequelize.define("Agency", {
		agency_key: DataTypes.STRING,
		agency_id: DataTypes.STRING,
		agency_name: DataTypes.STRING,
		agency_url: DataTypes.STRING,
		agency_timezone: DataTypes.STRING,
		agency_lang: DataTypes.STRING
	}, {
		tableName: "agencies",
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