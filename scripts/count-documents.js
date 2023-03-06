const UsersElapsedTime = require('../app/models/userElapsedTime');
const PassiveMiningUserElapsedTimes = require('../app/models/passiveMiningUserElapsedTime');
const Users = require('../app/models/users');
const Withdrawal = require('../app/models/withdrawal');
const UsersPlans = require('../app/models/userPlans');

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
	Users.countDocuments({}, (error, count) => {
		console.log('Users', count);
	});
	UsersPlans.countDocuments({}, (error, count) => {
		console.log('UsersPlans', count);
	});
	Withdrawal.countDocuments({}, (error, count) => {
		console.log('Withdrawal', count);
	});
	PassiveMiningUserElapsedTimes.countDocuments({}, (error, count) => {
		console.log('PassiveMiningUserElapsedTimes', count);
	});
	UsersElapsedTime.countDocuments({}, (error, count) => {
		console.log('UsersElapsedTime', count);
	});
}).catch(error => { console.log('Something went wrong!', error) });