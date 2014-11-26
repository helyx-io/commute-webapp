////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var express = require('express');
var nodePem = require('pem');
var models = require('../models');
var security = require('../lib/security');


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router();

router.get('/', security.ensureAuthenticated, (req, res) => {
	models.PemClient.findAll({where: {userId: req.user.id}}).complete((err, pems) => {
		res.render('pem-clients', {title: "Pem List", err: err, pems: pems});
	});
});

router.get('/:id/remove', security.ensureAuthenticated, (req, res) => {
	models.PemClient.find({where: {userId: req.user.id, id: req.params.id}}).complete((err, pem) => {
		if (err != undefined) {
			res.send(500, err.message);
		}
		else {
			pem.destroy().complete((err, pem) => {
				if (err != undefined) {
					res.send(500, err.message);
				}
				else {
					res.redirect("/pem-clients/");
				}
			});
		}
	});
});

router.get('/:id/private-key', security.ensureAuthenticated, (req, res) => {
	models.PemClient.find({where: {userId: req.user.id, id: req.params.id}}).complete((err, pem) => {
		if (err != undefined) {
			res.send(500, err.message);
		}
		else {
			res.contentType('text/plain');
			res.send(pem.privateKey);
		}
	});
});

router.get('/:id/certificate', security.ensureAuthenticated, (req, res) => {
	models.PemClient.find({where: {userId: req.user.id, id: req.params.id}}).complete((err, pem) => {
		if (err != undefined) {
			res.send(500, err.message);
		}
		else {
			res.contentType('text/plain');
			res.send(pem.certificate);
		}
	});
});

router.get('/:id/certificate/infos', security.ensureAuthenticated, (req, res) => {
	models.PemClient.find({where: {userId: req.user.id, id: req.params.id}}).complete((err, pem) => {
		nodePem.readCertificateInfo(pem.certificate, (err, certInfos) => {
			if (err != undefined) {
				res.send(500, err.message);
			}
			else {
				res.json(certInfos);
			}
		});
	});
});

router.get('/generate', security.ensureAuthenticated, (req, res) => {
	var options = {
		days: 1,
		keyBitsize: 2048,
		hash: 'sha256',
		emailAddress: req.user.email,
		selfSigned: true
	};
	nodePem.createCertificate(options, (err, keys) => {
		nodePem.getFingerprint(keys.certificate, (err, result) => {

			if (err != undefined) {
				res.send(500, err.message);
			}
			else {
				var pemClient = models.PemClient.build({
					userId: req.user.id,
					privateKey: keys.serviceKey,
					certificate: keys.certificate,
					fingerprint: result.fingerprint
				});
				pemClient.save().complete((err, pemClient) => {
					if (err != undefined) {
						res.send(500, err.message);
					}
					else {
						res.redirect("/pem-clients/");
					}
				});
			}
		});
	});

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
