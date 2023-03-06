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

function askMonthYear(callback) {
	rl.question('Month-Year (MM-YYYY): ', monthYear => {
		if(monthYear) {
			callback(monthYear);
		} else {
			askMonthYear(callback);
		}
	});
}

dbConnection().then(() => {
	askMonthYear((monthYear) => {
		const arr = monthYear.split('-');
		const mm = parseInt(arr[0]);
		const yyyy = parseInt(arr[1]);

		const som = new Date(yyyy, mm-1, 1, 0, 0, 0, 0);
		const eom = new Date(yyyy, mm, 0, 23, 59, 59, 999);

		Withdrawal.countDocuments({ createdAt: { $gte: som }, createdAt: { $lte: eom } }, (error, count) => {
			console.log(count);
		});
	});
}).catch(error => { console.log('Something went wrong!', error) });