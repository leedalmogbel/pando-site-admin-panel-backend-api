const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const path = require('path');

const config = require(path.join(__dirname, '/config/config'));
const log = require(path.join(__dirname, 'log'));

module.exports = function () {
	var uri = ''.concat('mongodb://',config.db.user,':',config.db.pass,'@',config.db.host, ':', config.db.port, '/', config.db.name);
	const options = { promiseLibrary: require('bluebird') };
	uri = `${uri}?keepAlive=true&autoReconnect=true`;

	mongoose.connect(uri, { useNewUrlParser: true });
	const db = mongoose.createConnection(uri, options);

	db.on('connected', function () {
		log.info('Mongodb connection open to ' + uri);
	});
	db.on('error', function () {
		throw new Error('unable to connect to database at ' + uri);
	});
	db.on('disconnected', function () {
		log.info('Mongodb connection disconnected');
	});
	process.on('SIGINT', function () {
		db.close(function () {
			log.info('Mongodb connection disconnected through app termination');
			process.exit(0);
		});
	});
};