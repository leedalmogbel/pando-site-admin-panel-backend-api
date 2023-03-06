const readline = require('readline');
const { Writable } = require('stream');

const BlackList = require('../app/models/blacklist');

const dbConnection = require('./scripts-db-connection');

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

function askEmail() {
	rl.question('User Email: ', email => {
		if(email) {
			addToBlacklist(email);
		} else {
			askEmail();
		}
	});
}

function addToBlacklist(email) {
	const newEntry = new BlackList({
		email_id: email
	});
	newEntry.save((error, result) => {
		console.log(result);
		askEmail();
	});
}

dbConnection().then(() => {
	askEmail();
}).catch(error => { console.log('Something went wrong!') });