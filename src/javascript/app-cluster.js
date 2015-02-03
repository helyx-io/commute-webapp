var fs = require('fs');
var util = require('util');
var http = require('http');
var recluster = require('recluster');
var logger = require('winston');

var cluster = recluster("" + __dirname + "/app");

cluster.run();

fs.watchFile("package.json", (curr, prev) => {
	logger.info("Package.json changed, reloading cluster...");
	return cluster.reload();
});

process.on("SIGUSR2", () => {
	logger.info("Got SIGUSR2, reloading cluster...");
	return cluster.reload();
});

logger.info("Spawned cluster, kill -s SIGUSR2 " + process.pid + " to reload");
