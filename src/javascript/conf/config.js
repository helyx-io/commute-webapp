////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

var appName = 'helyx.io';

var db = {
	dialect: 'mysql',
	database: process.env.MYSQL_DATABASE || 'gtfs',
	host: process.env.MYSQL_HOSTNAME || 'localhost',
	port: process.env.MYSQL_PORT || 3306,
	username: process.env.MYSQL_USERNAME || 'gtfs',
	password: process.env.MYSQL_PASSWORD || 'gtfs',
	pool: {
		min: process.env.MYSQL_POOL_MIN || 0,
		max: process.env.MYSQL_POOL_MAX || 7
	}
};

var env = process.env.NODE_ENV || 'development';

module.exports = {
	env: env,
	hostname: process.env.APP_HOSTNAME || 'gtfs.helyx.org',
	port: process.env.APP_HTTP_PORT || 9000,
	appname: appName,
	auth: {
		admin: (process.env.AUTH_ADMIN || 'alexis.kinsella@gmail.com').split(','),
		google: {
			clientId: process.env.AUTH_GOOGLE_CLIENT_ID,
			clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET,
			callbackUrl: process.env.AUTH_GOOGLE_CALLBACK_URL || 'http://localhost'
		}
	},
	logger: {
		threshold: process.env.LOGGER_THRESHOLD_LEVEL || 'debug',
		console: {
			level: process.env.LOGGER_CONSOLE_LEVEL || 'debug'
		},
		file: {
			level: process.env.LOGGER_FILE_LEVEL || 'debug',
			directory: process.env.LOGGER_FILE_DIRECTORY || 'logs',
			filename: process.env.LOGGER_FILE_FILENAME || ("" + appName + "/logs.log")
		}
	},
	db: db,
	monitoring: {
		newrelic: {
			apiKey: process.env.NEW_RELIC_API_KEY,
			appName: process.env.NEW_RELIC_APP_NAME || 'gtfs-webapp'
		}
	}
};