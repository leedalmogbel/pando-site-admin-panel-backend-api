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
					console.log(ids.length);
					ids.forEach(async (userId) => {
						await UserPlans.findOne({ user_id: userId }, async function(error, userPlan) {
				            if(error) {
				                console.log(`Passive Mining Error: User ID - ${userId}`, error);
				            } else {
				                if(userPlan) {
				                	await Plans.findById(userPlan.purchased_plan_id, async function(error, plan) {
				                		const newMiningLog = new PassiveMiningUserElapsedTimes({
											user_id: userId,
											mining_rate: plan.passive_mining_rate,
											elapsed_datetime: new Date(),
											elapsed_time: 0,
											elapsed_pando_earned: 0,
											elapsed_datetime_end: null,
											usersplans_id: userPlan._id
										});

										await newMiningLog.save(function(error, result) {
											if(error) {
												console.log('Passive Mining Error: ', error);
											} else {
												console.log('Passive Mining: ', `New mining log added - ${userId} - ${newMiningLog.mining_rate} - ${newMiningLog.elapsed_datetime}`);
											}
										});
				                	});
				                } else {
				                    console.log(`Passive Mining: User ID - ${userId}`, 'No plans');
				                }
				            }
				        }).sort({ 'purchased_date': -1 });
					});
				} catch (error) {
					console.log(error);
				}
			});
		});
	});
}).catch(error => { console.log('Something went wrong!', error) });