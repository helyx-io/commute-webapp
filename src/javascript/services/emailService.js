////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////

var fs = require('fs');
var util = require('util');
var uuid = require('uuid');
var moment = require('moment');
var Promise = require('bluebird');
var _ = require('lodash');

var config = require('../conf/config');
var logger = require('../lib/logger');

var mandrill = require('mandrill-api/mandrill');
var Mailgun = require('mailgun-js');
var Sendgrid = require('sendgrid');
var nodemailer = require('nodemailer');
var smtpPool = require('nodemailer-smtp-pool');


////////////////////////////////////////////////////////////////////////////////////
//  TODO: Should have one class for each provider ...
////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////
// Functions
////////////////////////////////////////////////////////////////////////////////////

var sendEmailWithMandrill = (client, email, givenName, subject, htmlBody, txtBody, from, fromName) => {

	logger.info(`[MANDRILL] Sending email to '${givenName}' at address: '${email}'`);

	var deferred = Promise.pending();

	var message = {
		"html": htmlBody,
		"text": txtBody,
		"subject": subject,
		"from_email": from,
		"from_name": fromName,
		"to": [{
			"email": email,
			"name": givenName,
			"type": "to"
		}],
		"headers": {
			"Reply-To": from
		}
	};

	client.messages.send({"message": message}, function(result) {
		logger.info("[MANDRILL] Mail send result: " + JSON.stringify(result));
		deferred.resolve(result);
	}, function(err) {
		logger.error('[MANDRILL] A mandrill error occurred: ' + err.name + ' - ' + err.message);
		deferred.reject(err);
	});

	return deferred.promise;
};


var sendEmailWithMailGun = (client, email, givenName, subject, htmlBody, txtBody, from, fromName) => {

	logger.info(`[MAILGUN] Sending mail to '${givenName}' at address: '${email}'`);

	var deferred = Promise.pending();

	var data = {
		from: `${fromName} <${from}>`,
		to: `${givenName} <${email}>`,
		subject: subject,
		html: htmlBody,
		text: txtBody
	};

	client.messages().send(data, function (err, body) {
		if (err) {
			logger.error(`[MAILGUN] Got an error: ${util.inspect(err)}`);
			deferred.reject(err);
		} else {
			logger.info(`[MAILGUN] Body: ${JSON.stringify(body)}`);
			deferred.resolve(body);
		}
	});

	return deferred.promise;
};


var sendEmailWithSendGrid = (client, email, givenName, subject, htmlBody, txtBody, from, fromName) => {

	logger.info(`[SENDGRID] Sending mail to '${givenName}' at address: '${email}'`);

	var deferred = Promise.pending();

	var data = {
		from: from,
		fromname: fromName,
		to: email,
		toname: givenName,
		subject: subject,
		html: htmlBody,
		text: txtBody
	};

	sendgrid.send(new client.Email(data), function (err, body) {
		if (err) {
			logger.error(`[SENDGRID] Got an error: ${util.inspect(err)}`);
			deferred.reject(new Error("[SENDGRID][MANDRILL] No email provider to send email"));
		} else {
			logger.info(`[SENDGRID] Body: ${JSON.stringify(body)}`);
			deferred.resolve(body);
		}
	});

	return deferred.promise;
};


var sendEmailWithSMTP = (client, email, givenName, subject, htmlBody, txtBody, from, fromName) => {

	logger.info(`[SMTP] Sending mail to '${givenName}' at address: '${email}'`);

	var deferred = Promise.pending();

	var options = {
		from: `${fromName} <${from}>`,
		to: `${givenName} <${email}>`,
		subject: subject,
		html: htmlBody,
		text: txtBody
	};

	client.sendMail(options, function (err, body) {
		if (err) {
			logger.error(`[SMTP] Got an error: ${util.inspect(err)}`);
			deferred.reject(err);
		} else {
			logger.info(`[SMTP] Body: ${JSON.stringify(body)}`);
			deferred.resolve(body);
		}
	});

	return deferred.promise;
};


////////////////////////////////////////////////////////////////////////////////////
// Variables
////////////////////////////////////////////////////////////////////////////////////

var emailSendingProviders = [];


////////////////////////////////////////////////////////////////////////////////////
// Initialization
////////////////////////////////////////////////////////////////////////////////////

var isProviderEnabled = (provider) => {
	return (config.email.enabledProviders || []).indexOf(provider) >= 0;
};


if (config.email.mandrill.apiKey && isProviderEnabled('mandrill')) {

	logger.info('[EMAIL_SERVICE] Configuring Mandrill provider');

	var mandrillKeys = config.email.mandrill.apiKey.split(',');

	if (mandrillKeys) {
		mandrillKeys.forEach((mandrillKey) => {
			var mandrillClient = new mandrill.Mandrill(mandrillKey);
			emailSendingProviders.push({
				provider: 'mandrill',
				client: mandrillClient,
				sendEmail: sendEmailWithMandrill,
				from: config.email.mandrill.from
			});
		});
	}
}


if (config.email.mailgun.apiKey && isProviderEnabled('mailgun')) {

	logger.info('[EMAIL_SERVICE] Configuring Mailgun provider');

	var mailGunKey = config.email.mailgun.apiKey;

	var mailgunOpts = { apiKey: mailGunKey, domain: config.email.mailgun.domain };

	emailSendingProviders.push({
		provider: 'mailgun',
		client: new Mailgun(mailgunOpts),
		sendEmail: sendEmailWithMailGun,
		from: config.email.mailgun.from
	});
}


if (config.email.sendgrid.apiKey && isProviderEnabled('sendgrid')) {

	logger.info('[EMAIL_SERVICE] Configuring Sendgrid provider');

	var sendGridApiUser = config.email.sendgrid.apiUser;
	var sendGridApiKey = config.email.sendgrid.apiKey;

	var sendgrid = Sendgrid(sendGridApiUser, sendGridApiKey);

	emailSendingProviders.push({
		provider: 'sendgrid',
		client: sendgrid,
		sendEmail: sendEmailWithSendGrid,
		from: config.email.sendgrid.from
	});
}


if (config.email.smtp.host && isProviderEnabled('smtp')) {

	logger.info('[EMAIL_SERVICE] Configuring SMTP provider');

	var smtpHost = config.email.smtp.host;
	var smtpPort = config.email.smtp.port;
	var smtpUser = config.email.smtp.user;
	var smtpPassword = config.email.smtp.password;

	var smtpMailer = nodemailer.createTransport(smtpPool({
		host: smtpHost,
		port: smtpPort,
		auth: {
			user: smtpUser,
			pass: smtpPassword
		},
		tls: {
			rejectUnauthorized:false
		}
	}));

	emailSendingProviders.push({
		provider: 'smtp',
		client: smtpMailer,
		sendEmail: sendEmailWithSMTP,
		from: config.email.smtp.from
	});
}


if (emailSendingProviders.length == 0) {
	var errorMessage = 'No email provider configured. You should enable at least one!';
	logger.error(`[EMAIL_SERVICE] ${errorMessage}`);
	throw new Error(errorMessage);
}


var getRandomInt = (min, max) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
};


var sendEmail = (email, givenName, subject, htmlBody, txtBody, from, fromName) => {

	if (!emailSendingProviders || emailSendingProviders.length == 0) {
		var errorMessage = 'Failed to send email: No email provider available to send email';
		return Promise.reject(new Error(errorMessage));
	}

	var availableProviderNames = _.pluck(emailSendingProviders, 'provider');

	var randomValue = getRandomInt(0, emailSendingProviders.length - 1);
	var emailSendingProvider = emailSendingProviders[randomValue];

	logger.info(`[EMAIL_SERVICE] Choosing random email provider in list: ${util.inspect(availableProviderNames)} - Using '${emailSendingProvider.provider}' ...`);

	from = from || emailSendingProvider.from;
	fromName = fromName || 'Commute.sh';

	return emailSendingProvider.sendEmail(emailSendingProvider.client, email, givenName, subject, htmlBody, txtBody, from, fromName);
};


////////////////////////////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////////////////////////////

module.exports = {
	sendEmail: sendEmail
};