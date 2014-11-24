
////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var express = require('express');
var pem = require('pem')
var models = require('../models');
var security = require('../lib/security');


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router();

router.get('/', security.ensureAuthenticated, (req, res) => {
  models.PemClient.find({where: { userId: req.user.id }}).complete((err, pems) => {
    res.render('pem-clients', { title: "Pem List", err: err, pems: pems });
  });
});

router.get('/:id/private-key', security.ensureAuthenticated, (req, res) => {
  models.PemClient.find({where: { userId: req.user.id, id: req.params.id }}).complete((err, pem) => {
    res.contentType('text/plain');
    res.send(pem.privateKey);
  });
});

router.get('/:id/certificate', security.ensureAuthenticated, (req, res) => {
  models.PemClient.find({where: { userId: req.user.id, id: req.params.id }}).complete((err, pem) => {
    res.contentType('text/plain');
    res.send(pem.certificate);
  });
});

router.get('/generate', security.ensureAuthenticated, (req, res) => {

  pem.createCertificate({days:1, selfSigned:true}, (err, keys) => {

    var pemClient = models.PemClient.build({
      userId: req.user.id,
      privateKey: keys.serviceKey,
      certificate: keys.certificate
    });
    pemClient.save().complete((err, pemClient) => {
      res.redirect("/pem-clients/");
    });

  });

});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
