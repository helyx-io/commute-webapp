////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

var appName = 'commute.sh';

var db = {
	dialect: 'pg',
	database: process.env.DB_DATABASE || 'commute',
	host: process.env.DB_HOSTNAME || 'localhost',
	port: process.env.DB_PORT || 5432,
	username: process.env.DB_USERNAME || 'commute',
	password: process.env.DB_PASSWORD || 'commute',
	pool: {
		min: process.env.DB_POOL_MIN || 0,
		max: process.env.DB_POOL_MAX || 256
	}
};

db.url = `${db.dialect}://${db.username}:${db.password}@${db.host}:${db.port}/${db.database}?sslmode=disable`;

var env = process.env.NODE_ENV || 'development';

module.exports = {
	env: process.env.NODE_ENV || 'development',
	scheme: process.env.APP_SCHEME || 'http',
	host: process.env.APP_HOST || 'localhost',
	port: process.env.APP_PORT || process.env.PORT || 9000,
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
	admin: {
		username: process.env.ADMIN_USERNAME || 'admin',
		password: process.env.ADMIN_PASSWORD || 'admin'
	},
	import: {
		users: {
		filePath: process.env.IMPORT_USERS_PATH || 'data/users.csv'
		}
	},
	service: {
		mandrill: {
			apiKey: process.env.MANDRILL_API_KEY
		},
		commute: {
			baseURL: process.env.GTFS_API_BASE_URL || "http://localhost:4000"
		}
	},
	redis: {
		host: process.env.REDIS_HOST || process.env.SSDB_PORT_8888_TCP_ADDR || 'localhost',
		port: process.env.REDIS_PORT || process.env.SSDB_PORT_8888_TCP_PORT || 8888
	},
	db: db,
	monitoring: {
		newrelic: {
			apiKey: process.env.NEW_RELIC_API_KEY,
			appName: process.env.NEW_RELIC_APP_NAME || 'commute-webapp'
		}
	}
};