const dbConnection = require('./scripts-db-connection');
const { createMiningLogs } = require('../app/routes/modules/passive-mining');

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
	rl.question('lower: ', lower => {
		rl.question('upper: ', upper => {
			createMiningLogs(parseInt(lower), parseInt(upper));
		});
	});
}).catch(error => { console.log('Something went wrong!', error) });