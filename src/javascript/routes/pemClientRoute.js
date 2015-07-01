////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var express = require('express');
var Promise = require('bluebird');
var nodePem = require('pem');
var generatePassword = require('password-generator');
var moment = require('moment');
var util = require('util');

var security = require('../lib/security');
var logger = require('../lib/logger');

var DB = require('../lib/db');
var db = DB.schema('gtfs');


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router();

router.get('/', security.ensureAuthenticated, (req, res) => {
	new db.PemClients({userId: req.user.id}).fetch().then((pems) => {

		pems = pems.toJSON().map((pem) => {
			pem.createdAt = moment(pem.createdAt).format();
			return pem;
		});

		res.render('pem-clients', {title: "Pem List", pems: pems });
	}).catch((err) => {
		logger.info(`Failed to get pemClient with error: ${err.message}`, "Error:", new Error().stack, "Stack:" , err.stack);
		res.status(500);
	});
});

router.get('/:id/remove', security.ensureAuthenticated, (req, res) => {
	new db.PemClient({userId: req.user.id, id: req.params.id}).fetch().then((pem) => {
		return pem.destroy();
	}).then((pem) => {
		res.redirect("/pem-clients/");
	}).catch((err) => {
		logger.info(`Failed to remove pemClient with error: ${err.message}`, "Error:", new Error().stack, "Stack:" , err.stack);
		res.status(500);
	});
});

router.get('/:id/private-key', security.ensureAuthenticated, (req, res) => {
	new db.PemClient({userId: req.user.id, id: req.params.id}).fetch().then((pem) => {
		pem = pem.toJSON();
		res.contentType('text/plain');
		res.header('Content-Disposition', 'attachment;filename="private-key.pem"');
		res.send(pem.privateKey);
	}).catch((err) => {
		logger.info(`Failed to get pemClient private key with error: ${err.message}`, "Error:", new Error().stack, "Stack:" , err.stack);
		res.status(500);
	});
});

router.get('/:id/public-key', security.ensureAuthenticated, (req, res) => {
	new db.PemClient({userId: req.user.id, id: req.params.id}).fetch().then((pem) => {
		pem = pem.toJSON();
		res.contentType('text/plain');
		res.header('Content-Disposition', 'attachment;filename="public-key.pem"');
		res.send(pem.publicKey);
	}).catch((err) => {
		logger.info(`Failed to get pemClient public key with error: ${err.message}`, "Error:", new Error().stack, "Stack:" , err.stack);
		res.status(500);
	});
});

router.get('/:id/certificate', security.ensureAuthenticated, (req, res) => {
	new db.PemClient({userId: req.user.id, id: req.params.id}).fetch().then((pem) => {
		pem = pem.toJSON();
		res.contentType('text/plain');
		res.header('Content-Disposition', 'attachment;filename="certificate.crt"');
		res.send(pem.certificate);
	}).catch((err) => {
		logger.info(`Failed to get pemClient certificate with error: ${err.message}`, "Error:", new Error().stack, "Stack:" , err.stack);
		res.status(500);
	});
});

router.get('/:id/certificate/infos', security.ensureAuthenticated, (req, res) => {
	new db.PemClient({userId: req.user.id, id: req.params.id}).fetch().then((pem) => {
		pem = pem.toJSON();
		return Promise.promisify(nodePem.readCertificateInfo)(pem.certificate);
	}).then((certInfos) => {
		res.json(certInfos);
	}).catch((err) => {
		logger.info(`Failed to read pemClient certificate info with error: ${err.message}`, "Error:", new Error().stack, "Stack:" , err.stack);
		res.status(500);
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

	Promise.promisify(nodePem.createCertificate)(options).then((keys) => {
		return Promise.promisify(nodePem.getFingerprint)(keys.certificate).then((fpResult) => {
			return Promise.promisify(nodePem.getPublicKey)(keys.certificate).then((pkResult) => {
				return new db.PemClient({
					userId: req.user.id,
					privateKey: keys.serviceKey,
					publicKey: pkResult.publicKey,
					certificate: keys.certificate,
					fingerprint: fpResult.fingerprint,
					keyPassword: options.keyPassword,
					certPassword: options.certPassword,
					days: options.days
				}).save();
			});
		});
	}).then((createdPemClient) => {
		res.redirect("/pem-clients/");
	}).catch((err) => {
		logger.info(`Failed to generate pemClient with error: ${err.message}`, "Error:", new Error().stack, "Stack:" , err.stack);
		res.status(500);
	});

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
