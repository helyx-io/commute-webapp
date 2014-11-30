////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var express = require('express');
var nodePem = require('pem');
var models = require('../models');
var security = require('../lib/security');
var logger = require('../log/logger');
var generatePassword = require('password-generator');
var moment = require('moment');

var PemClient = models.PemClient;

////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router();

router.get('/', security.ensureAuthenticated, (req, res) => {
	PemClient.findAll({where: {userId: req.user.id}}).complete((err, pems) => {

		pems = pems.map((pem) => {
			pem = pem.toJSON();
			pem.createdAt = moment(pem.createdAt).format();
			return pem;
		});

		res.render('pem-clients', {title: "Pem List", err: err, pems: pems });
	});
});

router.get('/:id/remove', security.ensureAuthenticated, (req, res) => {
	PemClient.find({where: {userId: req.user.id, id: req.params.id}}).complete((err, pem) => {
		if (err != undefined) {
			logger.info(err.message, "Error:", new Error().stack, "Stack:" , err.stack);
			res.status(500).send(err.message);
		}
		else {
			pem.destroy().complete((err, pem) => {
				if (err != undefined) {
					logger.info(err.message, "Error:", new Error().stack, "Stack:" , err.stack);
					res.status(500).send(err.message);
				}
				else {
					res.redirect("/pem-clients/");
				}
			});
		}
	});
});

router.get('/:id/private-key', security.ensureAuthenticated, (req, res) => {
	PemClient.find({where: {userId: req.user.id, id: req.params.id}}).complete((err, pem) => {
		if (err != undefined) {
			logger.info(err.message, "Error:", new Error().stack, "Stack:" , err.stack);
			res.status(500).send(err.message);
		}
		else {
			res.contentType('text/plain');
			res.header('Content-Disposition', 'attachment;filename="key.pem"');
			res.send(pem.privateKey);
		}
	});
});

router.get('/:id/certificate', security.ensureAuthenticated, (req, res) => {
	PemClient.find({where: {userId: req.user.id, id: req.params.id}}).complete((err, pem) => {
		if (err != undefined) {
			logger.info(err.message, "Error:", new Error().stack, "Stack:" , err.stack);
			res.status(500).send(err.message);
		}
		else {
			res.contentType('text/plain');
			res.header('Content-Disposition', 'attachment;filename="certificate.crt"');
			res.send(pem.certificate);
		}
	});
});

router.get('/:id/certificate/infos', security.ensureAuthenticated, (req, res) => {
	PemClient.find({where: {userId: req.user.id, id: req.params.id}}).complete((err, pem) => {
		nodePem.readCertificateInfo(pem.certificate, (err, certInfos) => {
			if (err != undefined) {
				logger.info(err.message, "Error:", new Error().stack, "Stack:" , err.stack);
				res.status(500).send(err.message);
			}
			else {
				res.json(certInfos);
			}
		});
	});
});

router.get('/generate', security.ensureAuthenticated, (req, res) => {
	var options = {
		days: 365,
		keyBitsize: 2048,
		hash: 'sha256',
		emailAddress: req.user.email,
		selfSigned: true,
		keyPassword: generatePassword(12, false),
		certPassword: generatePassword(12, false),
		encryptAlgorithm: "aes128"
	};

	nodePem.createCertificate(options, (err, keys) => {
		if (err != undefined) {
			logger.info(err.message, "Error:", new Error().stack, "Stack:" , err.stack);
			res.status(500).send(err.message);
		}
		else {
			nodePem.getFingerprint(keys.certificate, (err, result) => {

				if (err != undefined) {
					logger.info(err.message, "\nError:", new Error().stack, "\nStack:" , err.stack);
					res.status(500).send(err.message);
				}
				else {
					var pemClient = PemClient.build({
						userId: req.user.id,
						privateKey: keys.serviceKey,
						certificate: keys.certificate,
						fingerprint: result.fingerprint,
						keyPassword: options.keyPassword,
						certPassword: options.certPassword,
						days: options.days
					});
					pemClient.save().complete((err, pemClient) => {
						if (err != undefined) {
							logger.info(err.message, "\nError:", new Error().stack, "\nStack:" , err.stack);
							res.status(500).send(err.message);
						}
						else {
							res.redirect("/pem-clients/");
						}
					});
				}
			});
		}
	});

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
