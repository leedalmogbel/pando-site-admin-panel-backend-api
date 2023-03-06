const fs = require('fs');
const path = require('path');
const readline = require('readline');

const Users = require('../app/models/users');
const dbConnection = require('./scripts-db-connection');

dbConnection().then(() => {	
	const rl = readline.createInterface({
		input: fs.createReadStream(path.join(__dirname, 'users-list.txt'))
	})
	rl.on('line', function(userEmailId){
		Users.countDocuments({ email_id: userEmailId })
			.then(count => {
				if(count === 1){
					Users.findOne({ email_id: userEmailId })
						.then(user => {
							if(user.is_deleted === 0){
								user.is_deleted = 1;
								user.save()
									.then(result => {
										console.log(userEmailId + ' was successfully soft-deleted');
									})
									.catch(error => {
										console.log('Error on soft-deleting - ' + userEmailId);
									});
							}
						})
						.catch(error => {
							console.log(userEmailId + ' not found in the db');
						});
				} else if (count > 1){
					console.log('********** ' + userEmailId + ' has more than one record in the db **********');
				}
			})
			.catch(error => {
				console.log(userEmailId + ' not found in the db');
			});
	});
}).catch(error => { console.log('Something went wrong!') });