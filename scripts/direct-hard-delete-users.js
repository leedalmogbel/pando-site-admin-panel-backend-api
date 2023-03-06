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
		const email_id = userEmailId.toLowerCase().trim();

		Users.countDocuments({ email_id })
			.then(count => {
				if(count === 1){
					Users.deleteOne({ email_id }, (error, result) => {
						console.log(`${email_id} deleted`);
					});
				} else if (count > 1){
					console.log('********** ' + email_id + ' has more than one record in the db **********');
				} else if (count === 0){
					console.log(email_id + ' not found in the db');
				}
			})
			.catch(error => {
				console.log(email_id + ' not found in the db');
			});
	});
}).catch(error => { console.log('Something went wrong!') });