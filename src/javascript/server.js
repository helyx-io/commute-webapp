////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var pg = require('pg')
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var session = require('express-session');
var PgSessionStore = require('connect-pg-simple')(session);
var compression = require('compression');
var responseTime = require('response-time');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');

var config = require('./conf/config');

var allowCrossDomain = require('./lib/allowCrossDomain');
var requestLogger = require('./lib/requestLogger');

var authMiddleware = require('./middlewares/authMiddleware');

var basicStrategy = require('./passport/strategies/basicStrategy');
var bearerStrategy = require('./passport/strategies/bearerStrategy');
var localStrategy = require('./passport/strategies/localStrategy');
var googleStrategy = require('./passport/strategies/googleStrategy');
var clientJWTBearerStrategy = require('./passport/strategies/clientJWTBearerStrategy');

var role = require('./connect-roles-fixed');

var routes = require('./routes/index');

var authService = require('./services/authService');


////////////////////////////////////////////////////////////////////////////////////
// Applications
////////////////////////////////////////////////////////////////////////////////////

var app = express();

console.log("Environment: " + (app.get('env')));

app.disable("x-powered-by");

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
app.set("view options", {layout: false});
app.set('layout', 'layout');
app.disable('view cache');
app.engine('hjs', require('hogan-express'));


app.use( (req, res, next) => {
	req.forwardedSecure = req.headers["x-forwarded-proto"] === "https";
	return next();
});


////////////////////////////////////////////////////////////////////////////////////
// Security
////////////////////////////////////////////////////////////////////////////////////

// TODO: Fix me to support ClientJWTBearerStrategy
passport.serializeUser(authService.serializeUser);
passport.deserializeUser(authService.deserializeUserFromUserId);
passport.use(googleStrategy);
passport.use(clientJWTBearerStrategy);
passport.use(basicStrategy);
passport.use(localStrategy);
passport.use(bearerStrategy);

role.use(authService.checkRoleAnonymous);
role.use(authService.ROLE_AGENT, authService.checkRoleAgent);
role.use(authService.ROLE_SUPER_AGENT, authService.checkRoleSuperAgent);
role.use(authService.ROLE_ADMIN, authService.checkRoleAdmin);
role.setFailureHandler(authService.failureHandler);


////////////////////////////////////////////////////////////////////////////////////
// Middlewares
////////////////////////////////////////////////////////////////////////////////////

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(responseTime());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(allowCrossDomain());
app.use(requestLogger());
app.use(cookieParser());
// app.use(compression({ threshold: 512 }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
	store: new PgSessionStore({
		pg : pg,                                  // Use global pg-module
		conString : config.db.url,                // Connect using something else than default DATABASE_URL env variable
		tableName : 'sessions'                    // Use another table-name than the default "session" one
	}),
	resave: true,
	saveUninitialized: true,
	secret: process.env.SESSION_SECRET,
	cookie: {
		maxAge: 30 * 24 * 60 * 60 * 1000
	},
	key: "sessionId"
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(role);


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

app.use('/', routes);


////////////////////////////////////////////////////////////////////////////////////
// 404
////////////////////////////////////////////////////////////////////////////////////

// catch 404 and forward to error handler
app.use((req, res, next) => {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});


////////////////////////////////////////////////////////////////////////////////////
// 500 - error handlers
////////////////////////////////////////////////////////////////////////////////////

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use((err, req, res, next) => {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	app: app
}
