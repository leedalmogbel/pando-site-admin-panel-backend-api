const Withdrawal = require('../app/models/withdrawal');

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
	Withdrawal.countDocuments({ status: { $ne: 2 }})
		.then((count) => {
			console.log(count);
		})
		.catch(error => {
			console.log(error);
		});
}).catch(error => { console.log('Something went wrong!', error) });