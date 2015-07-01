////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var async = require('async');
var request = require('request');
var ApnAgent = require('apnagent');
var util = require('util');
var _ = require('lodash');
var moment = require('moment');
var logger = require('../lib/logger');
var config = require('../conf/config');
var Promise = require('bluebird');
var deviceService = require('../services/deviceService');


////////////////////////////////////////////////////////////////////////////////////
// Variables
////////////////////////////////////////////////////////////////////////////////////

var gateway = {};
var feedback = {};

////////////////////////////////////////////////////////////////////////////////////
// Helper functions
////////////////////////////////////////////////////////////////////////////////////

var indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };


////////////////////////////////////////////////////////////////////////////////////
// Functions
////////////////////////////////////////////////////////////////////////////////////

var pushNotification = function(pushTokens, message, url, activityId, objectId, objectType) {

	var deferred = Promise.pending();

	var startDate = moment();

	if (!config.apns.enabled) {
		logger.info("[APNS][DISABLED] Message: '" + (util.inspect(message)) + " to device");

		deferred.resolve();

		return;
	} else {
		if (logger.isDebugEnabled()) {
			logger.debug("[APNS] Try to push message to devices with tokens '" + JSON.stringify(pushTokens) + "': '" + message + "'");
		}

		if (pushTokens.length == 0) {
			logger.info("[APNS] Message not sent! No token provided: '" + message + "'");

			deferred.resolve();

			return;
		}

		var sendNotification = (pushToken, cb) => {

			var apnsMessage = gateway.createMessage().device(pushToken);

			apnsMessage.alert(message);
			apnsMessage.sound("default");

			if (url) {
				apnsMessage.set('url', url);
			}

			if (activityId) {
				apnsMessage.set('activityId', activityId);
			}

			if (objectId) {
				apnsMessage.set('objectId', objectId);
			}

			if (objectType) {
				apnsMessage.set('objectType', objectType);
			}

			if (logger.isDebugEnabled()) {
				logger.debug("[APNS] Serialized message: " + (JSON.stringify(apnsMessage.serialize())) + " for devices with tokens: '" + (util.inspect(pushToken)) + "'");
			} else {
				logger.info("[APNS] Serialized message: " + (JSON.stringify(apnsMessage.serialize())) + " for devices with tokens: '" + pushToken + "'");
			}

			apnsMessage.send(function(err) {
				if (err) {
					logger.error("[APNS] Could not send message for device with token: '" + pushToken + " - Stack: " + err.stack);

					deferred.resolve(err);
				} else {
					if (logger.isDebugEnabled()) {
						logger.debug("[APNS] Message sent to device with token: '" + pushToken + "': '" + message + "'");
					} else {
						logger.info("[APNS] Message sent to devices with token: '" + pushToken + "' : '" + message + "'");
					}
				}

				cb(err);
			});
		};


		async.forEachLimit(pushTokens, 5, sendNotification, (err) => {

			if (err) {
				logger.err("[APNS][ERR] Message sent - Content: '" + message + "' - Err: '" + util.inspect(err) + "'");
			} else {
				logger.info("[APNS] Message sent - Content: '" + message + "'");
			}

			logger.info("[APNS] Duration: " + moment.duration(moment().diff(startDate)).asMilliseconds() + " ms");

			if (err) {
				deferred.resolve(err);
			} else {
				deferred.resolve(message);
			}
		});
	}

	return deferred.promise;
};

var init = function() {

	if (!config.apns.enabled) {
		logger.info("[APNS][INIT] Apns is disabled");
		gateway = {};
		return feedback = {};
	} else {
		logger.info("[APNS][INIT] Apns is enabled");

		/* Gateway
		 */
		logger.info("[APNS][GATEWAY][INIT] Initializing APNS gateway");
		logger.info("[APNS][GATEWAY][INIT] Configuring Live gateway agent");

		gateway = new ApnAgent.Agent();

		logger.info("[APNS][GATEWAY][INIT] Cert file: '" + config.apns.certFile + "'");
		logger.info("[APNS][GATEWAY][INIT] Key file: '" + config.apns.keyFile + "'");

		gateway
			.set('cert file', config.apns.certFile)
			.set('key file', config.apns.keyFile)
			.set('expires', '1d')
			.set('reconnect delay', '1s')
			.set('cache ttl', '30m');

		if (config.apns.sandboxEnabled) {
			logger.info("[APNS][GATEWAY][INIT] Apns gateway sandbox mode");
			gateway.enable('sandbox');
		} else {
			logger.info("[APNS][GATEWAY][INIT] Apns gateway production mode !");
		}

		gateway.on("message:error", function(err, feedbackMsg) {

			logger.error("[APNS][GATEWAY][MESSAGE:ERROR][" + err.name + "][" + err.code + "] Message: '" + err.message + "'");

			switch (err.name) {
				case "GatewayNotificationError":
				case "GatewayMessageError":

					if (err.code === 8) {
						var pushToken = feedbackMsg.device().toString();

						logger.error("[APNS][GATEWAY][MESSAGE:ERROR][" + err.name + "][" + err.code + "] Device with token '" + pushToken + "' has an invalid token");

						deviceService.removeDeviceByToken(pushToken).then(() => {
							logger.info("[APNS][GATEWAY][MESSAGE:ERROR][" + err.name + "][" + err.code + "] Removed device with token '" + pushToken + "'");
						}).catch((err) => {
							logger.info("[APNS][GATEWAY][MESSAGE:ERROR][" + err.name + "][" + err.code + "] Could not remove device with token '" + pushToken + "': '" + err.message + "'");
						});
					}

					break;

				case "SerializationError":

					logger.error("[APNS][GATEWAY][MESSAGE:ERROR][" + err.name + "][" + err.code + "] Message: '" + err.message + "'");

					break;

				default:
					logger.error("[APNS][MESSAGE:ERROR][" + err.name + "] Error code: '" + err.code + "', Error feedbackMsg: '" + err.message + "'");

					break;
			}
		});

		gateway.connect(function(err) {
			if (err && err.name === "GatewayAuthorizationError") {
				logger.error("[APNS][GATEWAY][CONNECT] Authentication Error: " + err.message);
				process.exit(1);
			} else if (err) {
				throw err;
			} else {
				logger.info("[APNS][GATEWAY][CONNECT] Apn agent running");
			}
		});

		/*
		 * Feedback
		 */
		logger.info("[APNS][FEEDBACK][INIT] Initializing APNS feeback");
		logger.info("[APNS][FEEDBACK][INIT] Configuring Live feedback");

		feedback = new ApnAgent.Feedback();

		logger.info("[APNS][FEEDBACK][INIT] Cert file: '" + config.apns.certFile + "'");
		logger.info("[APNS][FEEDBACK][INIT] Key file: '" + config.apns.keyFile + "'");

		feedback.set('cert file', config.apns.certFile).set('key file', config.apns.keyFile).set('interval', '30s').set('concurrency', 1);

		if (config.apns.sandboxEnabled) {
			logger.info("[APNS][FEEDBACK][INIT] Apns feedback sandbox mode");
			feedback.enable('sandbox');
		} else {
			logger.info("[APNS][FEEDBACK][INIT] Apns feedback production mode !");
		}

		feedback.connect(function(err) {
			if (err && err.name === "FeedbackAuthorizationError") {
				logger.error("[APNS][FEEDBACK][CONNECT] Authentication Error: " + err.message);
				return process.exit(1);
			} else if (err) {
				throw err;
			} else {
				return logger.info("[APNS][FEEDBACK][CONNECT] Apn agent running");
			}
		});

		return feedback.use(function(device, timestamp, done) {

			logger.info("[APNS][FEEDBACK] Got a feedback for device with Id: '" + device.toString() + "' and timestamp: '" + timestamp + "' (" + moment(timestamp) + ")");
			var pushToken = device.toString();

			deviceService.removeDeviceByToken(pushToken).then(() => {
				logger.info("[APNS][FEEDBACK] Removed device with token '" + pushToken + "'");
				return done();
			}).catch((err) => {
				logger.info("[APNS][FEEDBACK] Could not remove device with token '" + pushToken + "': '" + err.message + "'");
				return done();
			});
		});
	}
};

module.exports = {
	init: init,
	pushNotification: pushNotification
};