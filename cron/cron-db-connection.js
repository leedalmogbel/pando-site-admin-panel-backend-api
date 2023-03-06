const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const config = require('../config/config');

module.exports = function () {
	return new Promise((resolve, reject) => {
		const uri = ''.concat('mongodb://',config.db.user,':',config.db.pass,'@',config.db.host, ':', config.db.port, '/', config.db.name);
		const options = { promiseLibrary: require('bluebird') };
		
		mongoose.connect(uri, { useNewUrlParser: true });
		const db = mongoose.createConnection(uri, options);

		db.on('connected', function () {
			console.log(uri);
			resolve();
		});

		db.on('error', function () {
			throw new Error('unable to connect to database at ' + uri);
			reject();
		});
	});
};