const readline = require('readline');
const { Writable } = require('stream');

const Plans = require('../app/models/plans');
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

const plan = {
}

function createPlan() {
	const _plan = new Plans(plan);
	_plan.save()
		.then(result => {
			console.log('Plan Created!');
			process.exit();
		})
		.catch(error => {
			console.log('Error while creating plan: '+error);
			process.exit();
		});
}

function askPlanName() {
	rl.question('Plan Name: ', planName => {
		plan.membership_name = planName;
		askPlanAmount();
	});
}

function askPlanAmount() {
	rl.question('Plan Amount: ', amount => {
		plan.amount = amount;
		askPlanLogoFileName();
	});
}

function askPlanLogoFileName() {
	rl.question('Plan Logo Filename: ', logoName => {
		plan.logo_name = logoName;
		askBoosterRate();
	});
}

function askBoosterRate(){
	rl.question('Booster Rate: ', boosterRate => {
		plan.booster_rate = boosterRate;
		createPlan();
		rl.close();
	});
}

dbConnection().then(() => {
	askPlanName();
}).catch(error => { console.log('Something went wrong!') });