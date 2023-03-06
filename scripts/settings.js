const dbConnection = require('./scripts-db-connection');
const Settings = require('../app/models/settings');

dbConnection().then(() => {
	Settings.findOne({}, function(error, settings) {
		if(error) {
			console.log(error);
			process.exit();
		} else {
			console.log('Current Settings', settings);
			process.exit();
		}
	});
}).catch(error => { console.log('Something went wrong!', error) });