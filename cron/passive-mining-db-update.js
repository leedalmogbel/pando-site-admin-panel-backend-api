const UsersPlans = require('../app/models/userPlans');
const PassiveMiningUserElapsedTimes = require('../app/models/passiveMiningUserElapsedTime');
const Users = require('../app/models/users');

const dbConnection = require('./cron-db-connection');

function timestamp() {
	return (new Date()).toISOString();
}

function updatePassiveMining() {
	UsersPlans.distinct('user_id', (error, userIds) => {
		if(error) {
			console.log(`${timestamp()} - ${error}`);
		} else {
			console.log(`${timestamp()} - Start update passive mining with ${userIds.length} users`);
			userIds.forEach((userId) => {
				Users.findOne({ _id: userId }, (error, user) => {
					if(error) {
						console.log(`${timestamp()} - Error checking if user with ID ${userId} exists`);
					} else {
						if(user) {
							PassiveMiningUserElapsedTimes.findOne({ user_id: userId }).sort({ elapsed_datetime: -1 })
								.then((latestMiningLog) => {
									if(latestMiningLog) {
										const prevPandoEarned = latestMiningLog.elapsed_pando_earned;

										const elapsed_datetime_end = new Date();
					                    latestMiningLog.elapsed_time = Math.round((elapsed_datetime_end.getTime() - latestMiningLog.elapsed_datetime.getTime()) / 1000);
					                    latestMiningLog.elapsed_pando_earned = parseFloat(parseFloat(latestMiningLog.mining_rate) * (latestMiningLog.elapsed_time / 60));

					                    const newPandoEarned = latestMiningLog.elapsed_pando_earned;

					                    PassiveMiningUserElapsedTimes.updateOne({ _id: latestMiningLog._id }, latestMiningLog, function(error, result) {
					                    	if(error) {
					                    		console.log(`${timestamp()} - Error updating for user with ID ${userId}`);
					                    	} else {
					                    		console.log(`${timestamp()} - Passive mining updated from ${prevPandoEarned} -> ${newPandoEarned} : START -> ${latestMiningLog.elapsed_datetime.toISOString()}`);
					                    	}
					                    });
				                	}
								})
								.catch(error => {
									console.log(`${timestamp()} - Error updating for user with ID ${userId}`);
								});
						}
					}
				});
			});
		}
	});
}

dbConnection().then(() => {
	updatePassiveMining();
}).catch(error => { console.log('Something went wrong!') });