const UsersElapsedTime = require('../app/models/userElapsedTime');
const PassiveMiningUserElapsedTimes = require('../app/models/passiveMiningUserElapsedTime');
const Users = require('../app/models/users');
const Withdrawal = require('../app/models/withdrawal');
const UsersPlans = require('../app/models/userPlans');
const Plans = require('../app/models/plans');
const dbConnection = require('./scripts-db-connection');

const fs = require('fs')
const path = require('path');
const readline = require('readline');

function generateReport() {
	const rl = readline.createInterface({
		input: fs.createReadStream(path.join(__dirname, 'users-list.txt'))
	});

	let asOf = new Date();
	asOf.setHours(5);
	asOf.setMinutes(0);
	asOf.setSeconds(0);
	asOf.setMilliseconds(0);

	console.log(asOf.toISOString());

	const writer = fs.createWriteStream(`top-earners-report/list-users-earners-report.txt`, {
		flags: 'a' // 'a' means appending (old data will be preserved)
	});

	rl.on('line', function(userEmailId) {
		const email_id = userEmailId.toLowerCase().trim();
		Users.findOne({ email_id }, (error, user) => {
			if(user) {
				const userId = user._id.toString();
				UsersElapsedTime.aggregate([
				        { $match: { user_id: userId, createdAt: { "$lte": asOf } } },
				        { $group: { _id: null, 
						            elapsed_pando_earned: { $sum: "$elapsed_pando_earned" }
						        } }
				    ]).then(result1 => {
				    	const elapsed_pando_earned = result1[0] ? result1[0].elapsed_pando_earned : 0;

				    	UsersElapsedTime.aggregate([
					        { $match: { ref_user_id: userId, createdAt: { "$lte": asOf } }  },
					        { $group: { _id: null, 
							            referral_pando_earned: { $sum: "$referral_pando_earned" }
							        } }
					    ]).then(result2 => {
					    	const referral_pando_earned = result2[0] ? result2[0].referral_pando_earned : 0;

					    	Withdrawal.aggregate([
						        { $match: { user_id: userId } },
						        { $group: { _id: null, 
								            total_withdraw: { $sum: "$total_amount" }
								        } }
						    ]).then((result3) => {
						    	const total_withdraw = result3[0] ? result3[0].total_withdraw : 0;

						    	PassiveMiningUserElapsedTimes.findOne({ user_id: userId }).sort({ _id: -1 })
						    		.then(latestEntry => {
						    			if(latestEntry) {
						    				 latestEntry.elapsed_time = Math.round((asOf.getTime() - latestEntry.elapsed_datetime.getTime()) / 1000);
						    				 latestEntry.elapsed_pando_earned = parseFloat(parseFloat(latestEntry.mining_rate) * (latestEntry.elapsed_time / 60));

						    				 PassiveMiningUserElapsedTimes.updateOne({ _id: latestEntry._id }, latestEntry, function(error, result) {
						                    	if(error) {
						                    		console.log(error);
						                    	} else {
						                    		PassiveMiningUserElapsedTimes.aggregate([
												        { $match: { user_id: userId, createdAt: { "$lte": asOf } } },
												        { $group: { _id: null, 
														            elapsed_pando_earned: { $sum: "$elapsed_pando_earned" }
														        } }
												    ]).then(result4=> {
												    	const passive_mining_elapsed_pando_earned = result4[0] ? result4[0].elapsed_pando_earned : 0;

												    	const totalEarnings = elapsed_pando_earned + referral_pando_earned + passive_mining_elapsed_pando_earned;
									    				const balance = totalEarnings - total_withdraw;

									    				console.log(`${email_id} - ${balance}`);
									    				writer.write(`${userId}%${userEmailId}%${elapsed_pando_earned}%${referral_pando_earned}%${passive_mining_elapsed_pando_earned}%${totalEarnings}%${total_withdraw}%${balance}\n`);
												    }).catch(error => {
												    	console.log(error);
												    })
						                    	}
						                    });
						    			} else {
						    				const totalEarnings = elapsed_pando_earned + referral_pando_earned;
						    				const balance = totalEarnings - total_withdraw;

						    				console.log(`${email_id} - ${balance}`);
						    				writer.write(`${userId}%${userEmailId}%${elapsed_pando_earned}%${referral_pando_earned}%0%${totalEarnings}%${total_withdraw}%${balance}\n`);
						    			}
						    		}).catch(error => {
						    			console.log(error);
						    		});
					    	}).catch(error => {
					    		console.log(error);
					    	});
					    }).catch(error => {
					    	console.log(error);
					    });
					}).catch(error => {
						console.log(error);
					});
				} else {
					console.log(`${userEmailId} not found in DB`);
				}
		});
	});
}

dbConnection().then(() => {
	generateReport();
}).catch(error => { console.log('Something went wrong!') });