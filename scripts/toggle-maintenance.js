const dbConnection = require('./scripts-db-connection');
const Settings = require('../app/models/settings');

dbConnection().then(() => {
	Settings.findOne({}, function(error, settings) {
		if(error) {
			console.log(error);
			process.exit();
		} else {
			console.log('Before', settings);
			settings.is_maintenance = !settings.is_maintenance;
			settings.save(function(error, result) {
				if(error) {
					console.log(error);
					process.exit();
				} else {
					console.log('After', result);
					process.exit();
				}
			});
		}
	});
}).catch(error => { console.log('Something went wrong!', error) });