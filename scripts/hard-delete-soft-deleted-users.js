const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Writable } = require('stream');

const Users = require('../app/models/users');
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

dbConnection().then(() => {	
	console.log();
	Users.countDocuments({ is_deleted: 1 })
		.then(count => {
			console.log(`There are ${count} soft-deleted users`);
			if(count) {
				askIfPurge();
			} else {
				process.exit();
			}
		})
		.catch(error => {
			console.log(error);
			process.exit();
		});
}).catch(error => { console.log('Something went wrong!') });

function askIfPurge() {
	rl.question('Purge sof-deleted users (Y/n): ', answer => {
		if(answer === 'Y' || answer === 'y') {
			Users.deleteMany({ is_deleted: 1 })
				.then(result => {
					console.log(`Soft-deleted users was successfully purged!`);
					console.log(result);
					process.exit();
				})
				.catch(error => {
					console.log(error);
					process.exit();
				});
		} else if(answer === 'N' || answer === 'n') {
			process.exit();
		} else {
			askIfPurge();
		}
	});
}