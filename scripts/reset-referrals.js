const dbConnection = require('./scripts-db-connection');
const Users = require('../app/models/users');
const UsersElapsedTime = require('../app/models/userElapsedTime');

dbConnection().then(() => {
	Users.countDocuments({ referral_by: { $ne: '' }}, (error, countWithReferrer) => {
		if(error) {
			console.log(error);
		} else {
			console.log('Total users with Referrers: ', countWithReferrer);
			console.log('Reset users referral data...');
			Users.updateMany({}, { $set: { referral_by: '' } }, (error, result) => {
				if(error) {
					console.log(error);
				} else {
					console.log(result);
					console.log('Reset users referral earnings...');
					UsersElapsedTime.updateMany({}, { $set: { referral_pando_earned: 0 } }, (error, result) => {
						if(error) {
							console.log(error);
						} else {
							console.log(result);
							process.exit();
						}
					});
				}
			});
		}
	});
}).catch(error => { console.log('Something went wrong!', error) });