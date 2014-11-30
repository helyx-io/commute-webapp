////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');
var mkdirp = require('mkdirp');
var moment = require('moment');
var winston = require('winston');
var _ = require('lodash');

var config = require('../conf/config');


////////////////////////////////////////////////////////////////////////////////////
// Config
////////////////////////////////////////////////////////////////////////////////////

var loggerConfig = {
	levels: {
		trace: 0,
		debug: 1,
		info: 2,
		warn: 3,
		error: 4
	},
	colors: {
		trace: 'magenta',
		debug: 'blue',
		info: 'green',
		warn: 'yellow',
		error: 'red'
	},
	transports: {
		console: {
			level: config.logger.console.level,
			colorize: true,
			timestamp: "YYYY-MM-DD HH:mm:ss.SSS"
		},
		file: {
			dir: config.logger.file.directory,
			filename: config.logger.file.filename,
			level: config.logger.file.level,
			json: false,
			timestamp: "YYYY-MM-DD HH:mm:ss.SSS",
			maxsize: 1024 * 1024 * 10
		}
	}
};

winston.addColors(loggerConfig.colors);

if (!fs.existsSync("" + loggerConfig.transports.file.dir)) {
	mkdirp.sync("" + loggerConfig.transports.file.dir);
}

console.log("Logging to file: '" + loggerConfig.transports.file.dir + "/" + loggerConfig.transports.file.filename + "'\n");


////////////////////////////////////////////////////////////////////////////////////
// logger
////////////////////////////////////////////////////////////////////////////////////

var logger = new winston.Logger({
	level: config.logger.threshold,
	levels: loggerConfig.levels,
	transports: [
		new winston.transports.Console({
			level: loggerConfig.transports.console.level,
			levels: loggerConfig.levels,
			colorize: loggerConfig.transports.console.colorize,
			timestamp: function() {
				return moment(Date.now()).format(loggerConfig.transports.console.timestamp);
			}
		})
	]
});

logger.isLevelEnabled = function(level) {
	return _.any(this.transports, function(transport) {
		return (transport.level && logger.levels[transport.level] <= logger.levels[level]) || (!transport.level && logger.levels[logger.level] <= logger.levels[level]);
	});
};

var isDebugEnabled = logger.isLevelEnabled('debug');

logger.isDebugEnabled = function() {
	return isDebugEnabled;
};

var isTraceEnabled = logger.isLevelEnabled('trace');

logger.isTraceEnabled = function() {
	return isTraceEnabled;
};

var isInfoEnabled = logger.isLevelEnabled('info');

logger.isInfoEnabled = function() {
	return isInfoEnabled;
};

module.exports = logger;
