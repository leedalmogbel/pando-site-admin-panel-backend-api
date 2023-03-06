const UserPlans = require('../app/models/userPlans');
const Plans = require('../app/models/plans');
const PassiveMiningUserElapsedTimes = require('../app/models/passiveMiningUserElapsedTime');

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

dbConnection().then(() => {
	UserPlans.distinct('user_id', function(error, ids){
		console.log(ids.length);
		rl.question('Lower: ', lower => {
			rl.question('Upper: ', upper => {
				try {
					ids = ids.slice(parseInt(lower), parseInt(upper));
					let totalPlanAmount = 0;

					const getTotalPlanAmount = ids.map(async (id) => {
						await UserPlans.findOne({ user_id: id })
							.sort({ createdAt: -1 })
							.then(async (userPlan) => {
								await Plans.findById(userPlan.purchased_plan_id)
									.then((plan) => {
										totalPlanAmount += plan.amount;
									})
									.catch(error => {
										console.log(error);
									});
							})
							.catch(error => {
								console.log(error);
							})
					});

					Promise.all(getTotalPlanAmount)
						.then(() => {
							console.log(totalPlanAmount);
						});
				} catch (error) {
					console.log(error);
				}
			});
		});
	});
}).catch(error => { console.log('Something went wrong!', error) });