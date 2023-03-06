const readline = require('readline');
const { Writable } = require('stream');

const Users = require('../app/models/users');
const UsersPlans = require('../app/models/userPlans');
const Plans = require('../app/models/plans');

const fs = require('fs')

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
	path: `top-earners-report/negative-earners-report-${(new Date()).toISOString()}.csv`,
	header: [
		{id: 'name', title: 'Name'},
		{id: 'email', title: 'Email'},
		{id: 'date_registered', title: 'Date Registered'},
		{id: 'elapsed_time', title: 'Runtime Total Elapsed Time (Seconds)'},
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
		userId: arr[0],
		name: arr[1],
		email: arr[2],
		date_registered: arr[3],
		elapsed_time: arr[4],
		elapsed_pando_earned: parseFloat(arr[5]),
		referral_pando_earned: parseFloat(arr[6]),
		passive_mining_elapsed_pando_earned: parseFloat(arr[7]),
		total_earnings: parseFloat(arr[8]),
		total_withdraw: parseFloat(arr[9]),
		plan: parseInt(arr[10])
	}
}

function generateReport() {
	const top = 20;

	fs.readFile(`top-earners-report/top-earners-report-v2-01.txt`, 'utf-8', (error, data) => {
		const lines = data.split('\n');
		const users = [];

		lines.forEach(line => {
			users.push(stringToObject(line));
		});

		console.log(users.length);

		const usersWithNegativeEarnings = users.filter((user) => user.total_earnings < 0);

		csvWriter
		  .writeRecords(usersWithNegativeEarnings)
		  .then(()=> {
		  	console.log('The CSV file was written successfully')
		  	process.exit();
		  });
	});
}

generateReport();