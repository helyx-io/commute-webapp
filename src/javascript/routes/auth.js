////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var express = require('express');
var passport = require('passport');

var security = require('../lib/security');


////////////////////////////////////////////////////////////////////////////////////
// Routes
////////////////////////////////////////////////////////////////////////////////////

var router = express.Router();

router.post('/login', passport.authenticate('local', (req, res) => {
	return res.redirect("/");
}));

router.get('/login', (req, res) => {
	return res.render('login');
});

router.get('/logout', (req, res) => {
	req.logout();
	return res.redirect("/auth/login");
});

router.get('/google', passport.authenticate('google', {
	scope: 'https://www.googleapis.com/auth/plus.me https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
	failureRedirect: '/#/login'
}));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/#/login' }), (req, res) => {
	return res.redirect("/");
});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = router;
