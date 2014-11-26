////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	hostname: process.env.APP_HOSTNAME || 'dev.helyx.org',
	port: process.env.APP_HTTP_PORT || 9000,
	appname: 'helyx.io',
	auth: {
		admin: (process.env.AUTH_ADMIN || 'alexis.kinsella@gmail.com').split(','),
		google: {
			clientId: process.env.AUTH_GOOGLE_CLIENT_ID,
			clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET,
			callbackUrl: process.env.AUTH_GOOGLE_CALLBACK_URL || 'http://localhost'
		}
	},
	sequelize: {
		development: {
			dialect: 'mysql',
			database: process.env.MYSQL_DATABASE || 'gtfs',
			host: process.env.MYSQL_HOSTNAME || 'localhost',
			port: process.env.MYSQL_PORT || 3306,
			username: process.env.MYSQL_USERNAME || 'gtfs',
			password: process.env.MYSQL_PASSWORD || 'gtfs'
		}
	},
	monitoring: {
		newrelic: {
			apiKey: process.env.NEW_RELIC_API_KEY,
			appName: process.env.NEW_RELIC_APP_NAME || 'gtfs-webapp'
		}
	}
};