////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var Promise = require('bluebird');

var logger = require('../lib/logger');

var config = require('../conf/config');

var DB = require('../lib/db');


////////////////////////////////////////////////////////////////////////////////////
// Functions
////////////////////////////////////////////////////////////////////////////////////


let removeDeviceByToken = (token) => {
	return DB.knex('devices').where('token', '=', token).delete();
};


let removeDeviceByTokenAndUserId = (userId, token) => {
	return DB.knex('devices').where('token', '=', token).andWhere('userId', '=', userId).delete();
};


let findDeviceByUdId = (userId, udid) => {
	return DB.knex('devices').where('udid', '=', udid).andWhere('userId', '=', userId);
};

let updateDeviceByUdid = (userId, udid, token, deviceModel, systemVersion) => {
	return DB.knex('devices').where('udid', '=', udid).andWhere('userId', '=', userId).update({
		deviceModel: deviceModel,
		systemVersion: systemVersion,
		token: token
	}).then(() => {
		return Promise.resolve();
	});
};

let createDevice = (userId, udid, token, deviceModel, systemVersion) => {
	return DB.knex('devices').insert({
		userId: userId,
		udid: udid,
		token: token,
		deviceModel: deviceModel,
		systemVersion: systemVersion
	}).then((deviceIds) => {
		return Promise.resolve(deviceIds[0]);
	});
};

let registerOrUpdateDevice = (userId, udid, token, deviceModel, systemVersion) => {
	return findDeviceByUdId(userId, udid).then((devices) => {
		if (devices && devices.length == 1) {
			return updateDeviceByUdid(userId, udid, token, deviceModel, systemVersion);
		} else {
			return createDevice(userId, udid, token, deviceModel, systemVersion);
		}
	})
};


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	removeDeviceByToken: removeDeviceByToken,
	registerOrUpdateDevice: registerOrUpdateDevice,
	removeDeviceByTokenAndUserId: removeDeviceByTokenAndUserId
};