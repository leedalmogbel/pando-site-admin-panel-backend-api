const readline = require('readline');
const { Writable } = require('stream');

const Users = require('../app/models/users');
const UsersPlans = require('../app/models/userPlans');
const Plans = require('../app/models/plans');

const fs = require('fs')

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
	path: `top-earners-report/top-earners-report-${(new Date()).toISOString()}.csv`,
	header: [
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
		email: arr[0],
		date_registered: arr[1],
		elapsed_time: arr[2],
		elapsed_pando_earned: parseFloat(arr[3]),
		referral_pando_earned: parseFloat(arr[4]),
		passive_mining_elapsed_pando_earned: parseFloat(arr[5]),
		total_earnings: parseFloat(arr[6]) || 0,
		total_withdraw: parseFloat(arr[7]),
		plan: parseInt(arr[8]) || 0
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

		const usersWithNoPlansList = users.filter((user) => user.plan == 0);
		console.log(usersWithNoPlansList.length);
		const usersWithPlansList = users.filter((user) => user.plan != 0);
		console.log(usersWithPlansList.length);

		const userWithPlans = [];
		const userWithNoPlans = [];

		usersWithNoPlansList.sort((a, b) => {
			if(a.total_earnings > b.total_earnings) {
				return -1;
			} else if(a.total_earnings < b.total_earnings) {
				return 1;
			} else {
				return 0;
			}
		});

		usersWithNoPlansList.forEach((user) => {
			if(userWithNoPlans.length < top) {
				console.log(user.email, user.total_earnings, user.plan);
				userWithNoPlans.push(user);
			}
		});

		usersWithPlansList.sort((a, b) => {
			if(a.total_earnings > b.total_earnings) {
				return -1;
			} else if(a.total_earnings < b.total_earnings) {
				return 1;
			} else {
				return 0;
			}
		});

		usersWithPlansList.forEach((user) => {
			if(userWithPlans.length < top) {
				console.log(user.email, user.total_earnings, user.plan);
				userWithPlans.push(user);
			}
		});

		csvWriter
		  .writeRecords(userWithPlans.concat(userWithNoPlans))
		  .then(()=> {
		  	console.log('The CSV file was written successfully')
		  	process.exit();
		  });
	});
}

generateReport();