////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var util = require('util');
var uuid = require('uuid');

var logger = require('../log/logger');


////////////////////////////////////////////////////////////////////////////////////
// Middleware
////////////////////////////////////////////////////////////////////////////////////

var requestLoggerMiddleware = function() {
	return function(req, res, next) {
		var chunks, oldEnd, oldWrite, processingTime, responseBody, start;
		req.uid = uuid.v4();
		start = Date.now();
		processingTime = -1;
		responseBody = "<NOT_EXTRACTED>";
		if (logger.isTraceEnabled()) {
			oldWrite = res.write;
		}
		oldEnd = res.end;
		chunks = [];
		if (logger.isTraceEnabled()) {
			res.write = function(chunk) {
				chunks.push(chunk);
				return oldWrite.apply(res, arguments);
			};
		}
		res.end = function(chunk) {
			var reqProtocol;
			reqProtocol = req.headers["x-forwarded-proto"] || req.protocol;
			processingTime = Date.now() - start;
			if (logger.isTraceEnabled()) {
				if (chunk) {
					chunks.push(chunk);
					responseBody = Buffer.concat(chunks).toString('utf8');
				}
				if (logger.isTraceEnabled()) {
					logger.trace(
						"---------------------------------------------------------\n" +
						"Http Request - Url: " + reqProtocol + "://" + (req.get('host')) + req.originalUrl + "\n" +
						"Http Request - Query:  " + (util.inspect(req.query)) + "\n" +
						"Http Request - Method: " + req.method + "\n" +
						"Http Request - Headers: " + (util.inspect(req.headers)) + "\n" +
						"Http Request - Body: " + (util.inspect(req.body)) + "\n" +
						"--------------\n" +
						"Http Response - Body: " + (util.inspect(responseBody)) + "\n" +
						"Http Response - Processing time: " + processingTime + "ms\n" +
						"---------------------------------------------------------");
				}
			} else {
				logger.debug("" + req.method + " - " + reqProtocol + "://" + (req.get('host')) + req.originalUrl + " - " + processingTime + "ms");
			}
			return oldEnd.apply(res, arguments);
		};
		return next();
	};
};


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = requestLoggerMiddleware;
