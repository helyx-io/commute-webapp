var Promise = require('bluebird');
var util = require('util');
var events = require('events');

var logger = require('./logger');

var counter = 0;

var fetch = (client, key) => {

	var deferred = Promise.pending();
	var innerDeferred = Promise.pending();

	deferred.otherwhise = (options, method) => {

		innerDeferred.promise.then((collection) => {
			process.nextTick(() => {
				// Resolve the deferred immediately, because we got the data directly from Redis.
				// var start = Date.now();
				var jsonColletion = JSON.parse(collection);
				// logger.info(`JSON Parse access Done in ${Date.now() - start} ms`);
				deferred.resolve(jsonColletion);
			});
		}).catch(() => {

			// When the developer has resolved the promise, we need to store the data in Redis
			// for next time.
			deferred.promise.then((data) => {
				// Store the data in Redis!
				if (options.expiry) {
					client.setex(key, options.expiry, JSON.stringify(data));
				} else {
					client.set(key, JSON.stringify(data));
				}
			});

			process.nextTick(() => {
				// Invoke the developer defined callback to retrieve the data.
				method((err, data) => {
					if (err) {
						deferred.reject(err);
					}
					else {
						deferred.resolve(data);
					}

				});
			});

		});

		// Fetch the content from the Redis server.
		var start = Date.now();
		client.get(key, (error, result) => {
			// logger.info(`[${++counter}] Cache access Done in ${Date.now() - start} ms`);
			deferred.cacheKey = key;
			if (error || !result) {
				// An error occurred or the result was empty, therefore we'll reject
				// the deferred.
				innerDeferred.reject(error || new Error("No result found"));
			}
			else {
				// Otherwise everything is perfectly fine and we can resolve the deferred.
				innerDeferred.resolve(result);
			}
		});

		return deferred.promise;
	};

	return deferred;

};

module.exports = {
	fetch: fetch
};

