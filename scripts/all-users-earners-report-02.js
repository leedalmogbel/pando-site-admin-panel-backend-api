const readline = require('readline');
const { Writable } = require('stream');

const Users = require('../app/models/users');
const UsersPlans = require('../app/models/userPlans');
const Plans = require('../app/models/plans');

const fs = require('fs')

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
	path: `top-earners-report/all-users-earnings-report-${(new Date()).toISOString()}.csv`,
	header: [
		{id: 'name', title: 'Name'},
		{id: 'email', title: 'Email'},
		{id: 'elapsed_pando_earned', title: 'Runtime Earning'},
		{id: 'referral_pando_earned', title: 'Referral Earning'},
		{id: 'passive_mining_elapsed_pando_earned', title: 'Passive Earning'},
		{id: 'total_earnings', title: 'Total Earnings'},
		{id: 'total_withdraw', title: 'Total Withdraw'},
		{id: 'plan', title: 'Plan'}
	]
});

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

function stringToObject(line) {
	const arr = line.split('%');
	return {
		name: arr[0],
		email: arr[1],
		elapsed_pando_earned: parseFloat(arr[2]),
		referral_pando_earned: parseFloat(arr[3]),
		passive_mining_elapsed_pando_earned: parseFloat(arr[4]),
		total_earnings: parseFloat(arr[5]),
		total_withdraw: parseFloat(arr[6]),
		plan: parseInt(arr[7])
	}
}

function generateReport() {
	const top = 20;

	fs.readFile(`top-earners-report/all-users-earners-report-01.txt`, 'utf-8', (error, data) => {
		const lines = data.split('\n');
		let users = [];

		lines.forEach(line => {
			if(line) {
				users.push(stringToObject(line));
			}
		});

		console.log(users.length);

		users = users.filter((user) => user.total_earnings > 0);

		users.sort((a, b) => {
			if(a.total_earnings > b.total_earnings) {
				return -1;
			} else if(a.total_earnings < b.total_earnings) {
				return 1;
			} else {
				return 0;
			}
		});

		csvWriter
		  .writeRecords(users)
		  .then(()=> {
			console.log('The CSV file was written successfully')
			process.exit();
		  });
	});
}

generateReport();