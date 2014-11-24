(function() {
	var cluster, fs, http, logger, recluster, util;

	fs = require('fs');

	util = require('util');

	http = require('http');

	recluster = require('recluster');

	logger = require('winston');

	cluster = recluster("" + __dirname + "/app");

	cluster.run();

	fs.watchFile("package.json", function(curr, prev) {
		logger.info("Package.json changed, reloading cluster...");
		return cluster.reload();
	});

	process.on("SIGUSR2", function() {
		logger.info("Got SIGUSR2, reloading cluster...");
		return cluster.reload();
	});

	logger.info("Spawned cluster, kill -s SIGUSR2 " + process.pid + " to reload");

}).call(this);
