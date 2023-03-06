const Users = require('../app/models/users');
const UserPlans = require('../app/models/userPlans');

const dbConnection = require('./scripts-db-connection');

const readline = require('readline');
const { Writable } = require('stream');

let mute = false;
const mutableStdout = new Writable({
	write: (chunk, encoding, callback) => {
		if(!mute) {
			process.stdout.write(chunk, encoding);
		}
		callback();
	}
});

const rl = readline.createInterface({
	input: process.stdin,
	output: mutableStdout,
	terminal: true
});

dbConnection().then(() => {
	Users.countDocuments({ is_deleted: 0 }, (error, usersCount) => {
		console.log(`Total Users: ${usersCount}`);
	});

	UserPlans.distinct('user_id', function(error, ids) {
		console.log(`Unique User IDs with plan: ${ids.length}`);
		Users.countDocuments({ _id: { $in: ids }}, (error, planUsersCount) => {
			console.log(`Users with plan: ${planUsersCount}`);
		});
	});
}).catch(error => { console.log('Something went wrong!', error) });