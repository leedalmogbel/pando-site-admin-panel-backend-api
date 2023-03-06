const readline = require('readline');
const { Writable } = require('stream');

const Users = require('../app/models/users');
const Withdrawal = require('../app/models/withdrawal');
const dbConnection = require('./scripts-db-connection');

const fs = require('fs')
const path = require('path');
const moment = require('moment');

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

function askDateRange() {
	rl.question('From (mm/dd/yyyy hh:mm): ', fromDateStr => {
		rl.question('To (mm/dd/yyyy hh:mm): ', toDateStr => {
			generateReport(fromDateStr, toDateStr);
		});
	});
}

function convertToUtc(dateTimeStr, ss, ms) {
	const dateTimeArr = dateTimeStr.split(' ');
	const dateStr = dateTimeArr[0];
	const timeStr = dateTimeArr[1];

	const arr = dateStr.split('/');
	const mm = parseInt(arr[0]);
	const dd = parseInt(arr[1]);
	const yyyy = parseInt(arr[2]);

	const timeArr = timeStr.split(':');
	const hh = parseInt(timeArr[0]);
	const m = parseInt(timeArr[1]);

	const d = new Date(yyyy, mm-1, dd, hh, m, ss, ms);
	d.setHours(d.getHours() - 9);

	return d;
}

function generateReport(fromDateStr, toDateStr) {
	const fromDate = convertToUtc(fromDateStr, 0, 0);
	const toDate = convertToUtc(toDateStr, 0, 0);

	const txStatus = ['New', 'Pending', 'Succeed'];

	console.log(fromDate.toISOString(), toDate.toISOString());

	const writer = fs.createWriteStream(`top-earners-report/withdraw-history.csv`, {
		flags: 'a' // 'a' means appending (old data will be preserved)
	});

	Withdrawal.find({ createdAt: { "$gte": fromDate, "$lte": toDate } })
		.sort({ _id: -1 })
		.then(txs => {
			console.log(txs.length);

			txs.forEach(tx => {
				Users.findOne({ _id: tx.user_id }, (error, user) => {
					let userSt = tx.user_id;
					tx.createdAt.setHours(tx.createdAt.getHours() + 9);
					if(user) {
						userSt = user.email_id;
						console.log(`${userSt} - ${tx.total_amount}`);
						writer.write(`${moment(tx.createdAt).format()}%${tx._id}%${userSt}%${tx.total_amount}%${tx.receiver_address}%${tx.transaction_hash}%${txStatus[tx.status]}\n`);
					} else {
						console.log(`${userSt} - ${tx.total_amount}`);
						writer.write(`${moment(tx.createdAt).format()}%${tx._id}%${userSt}%${tx.total_amount}%${tx.receiver_address}%${tx.transaction_hash}%${txStatus[tx.status]}\n`);
					}
				});
			});
		})
		.catch(error => {
			console.log(error);
		});
}

dbConnection().then(() => {
	askDateRange();
}).catch(error => { console.log('Something went wrong!') });