////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

require("es6-shim");

var models = require("./models");
var passport = require('passport');
var config = require('./conf/config');
var logger = require('./log/logger');


////////////////////////////////////////////////////////////////////////////////////
// Application Initialization
////////////////////////////////////////////////////////////////////////////////////

var start = new Date();

var gracefullyClosing = false;

var server = require('./server');

var app = server.app;

app.set('port', process.env.PORT || config.port);

app.use((req, res, next) => {
  if (!gracefullyClosing) {
    return next();
  }
  res.setHeader("Connection", "close");
  return res.send(502, "Server is in the process of restarting");
});


////////////////////////////////////////////////////////////////////////////////////
// HTTP Server Initialization
////////////////////////////////////////////////////////////////////////////////////

models.sequelize.sync().success(function () {
  var server = app.listen(app.get('port'), function() {
    logger.debug('Express server listening on port ' + server.address().port);
  });
});


////////////////////////////////////////////////////////////////////////////////////
// Signal Handlers
////////////////////////////////////////////////////////////////////////////////////

process.on('SIGTERM',  () => {
  console.log("Received kill signal (SIGTERM), shutting down gracefully.");
  gracefullyClosing = true;
  server.close(() => {
    console.log("Closed out remaining connections.");
    return process.exit();
  });
  return setTimeout(() => {
    console.error("Could not close connections in time, forcefully shutting down");
    return process.exit(1);
  }, 30 * 1000);
});


////////////////////////////////////////////////////////////////////////////////////
// Uncaught Exceptions
////////////////////////////////////////////////////////////////////////////////////

process.on('uncaughtException', (err) => {
  console.error("An uncaughtException was found, the program will end. " + err + ", stacktrace: " + err.stack);
  return process.exit(1);
});


////////////////////////////////////////////////////////////////////////////////////
// Logs
////////////////////////////////////////////////////////////////////////////////////

console.log("Express listening on port: " + (app.get('port')));

console.log("Started in " + ((new Date().getTime() - start.getTime()) / 1000) + " seconds");
