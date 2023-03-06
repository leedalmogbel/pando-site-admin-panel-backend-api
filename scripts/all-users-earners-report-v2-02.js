const readline = require('readline');
const { Writable } = require('stream');

const Users = require('../app/models/users');
const UsersPlans = require('../app/models/userPlans');
const Plans = require('../app/models/plans');

const fs = require('fs')

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const ts = new Date().toISOString();

const csvWriter = createCsvWriter({
	path: `top-earners-report/all-users-earnings-report-v2-${ts}.csv`,
	header: [
		{id: 'email', title: 'Email'},
		{id: 'elapsed_pando_earned', title: 'Runtime Earning'},
		{id: 'referral_pando_earned', title: 'Referral Earning'},
		{id: 'passive_mining_elapsed_pando_earned', title: 'Passive Earning'},
		{id: 'total_earnings', title: 'Total Earnings'},
		{id: 'plan', title: 'Plan' }
	]
});

const statsCsvWriter = createCsvWriter({
	path: `top-earners-report/all-users-earnings-report-v2-stats-${ts}.csv`,
	header: [
		{id: 'plan', title: 'Plan'},
		{id: 'users', title: 'No. of Users'}
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
		elapsed_pando_earned: parseFloat(arr[1]),
		referral_pando_earned: parseFloat(arr[2]),
		passive_mining_elapsed_pando_earned: parseFloat(arr[3]),
		total_earnings: parseFloat(arr[4]) || 0,
		plan: parseInt(arr[5])
	}
}

function generateReport() {
	const top = 20;

	fs.readFile(`top-earners-report/all-users-earners-report-v2-01.txt`, 'utf-8', (error, data) => {
		const lines = data.split('\n');
		let users = [];
		const plans = [0];

		lines.forEach(line => {
			if(line) {
				const obj = stringToObject(line);
				users.push(obj);
				if(!plans.includes(obj.plan)) plans.push(obj.plan);
			}
		});

		console.log(users.length);

		// users = users.filter((user) => user.total_earnings > 0);

		users.sort((a, b) => {
			if(a.total_earnings > b.total_earnings) {
				return -1;
			} else if(a.total_earnings < b.total_earnings) {
				return 1;
			} else {
				return 0;
			}
		});

		const stats = [];

		plans.sort((a, b) => {
			if(parseInt(a) < parseInt(b)) return -1;
			if(parseInt(a) > parseInt(b)) return 1;
			return 0;
		});

		plans.forEach(plan => {
			const filterUsersByPlan = users.filter((user) => user.plan == plan);
			stats.push({ plan, users: filterUsersByPlan.length });
		});

		console.log(stats);

		csvWriter.writeRecords(users).then(()=> {
			statsCsvWriter.writeRecords(stats).then(() => {
				console.log('The CSV files was written successfully');
				process.exit();
			});
		});
	});
}

generateReport();