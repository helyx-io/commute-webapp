////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var LocalStrategy = require('passport-local');

var bcrypt = require('bcryptjs');

var config = require('../../conf/config');

var DB = require('../../lib/db');
var db = DB.schema('commute');


////////////////////////////////////////////////////////////////////////////////////
// Strategy
////////////////////////////////////////////////////////////////////////////////////

var localStrategy = new LocalStrategy({ usernameField: 'username',  passwordField: 'password' }, (email, password, done) => {
	db.knex("users").where({ email: email }).then((foundUsers) => {
		if (!foundUsers || foundUsers.length != 1) {
			return done(null, false, { message: 'Incorrect email.' });
		}

		bcrypt.compare(password, foundUsers[0].password, (err, res) => {
			if (!res) {
				return done(null, false, { message: 'Incorrect password.' });
			} else {
				return done(null, foundUsers[0]);
			}
		});
	}).catch((err) => {
		done(err);
	});
});


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = localStrategy;