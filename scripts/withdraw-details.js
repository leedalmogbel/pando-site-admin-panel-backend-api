const readline = require('readline');
const { Writable } = require('stream');

const UsersElapsedTime = require('../app/models/userElapsedTime');
const PassiveMiningUserElapsedTimes = require('../app/models/passiveMiningUserElapsedTime');
const Users = require('../app/models/users');
const Withdrawal = require('../app/models/withdrawal');
const UsersPlans = require('../app/models/userPlans');
const Plans = require('../app/models/plans');
const dbConnection = require('./scripts-db-connection');

const fs = require('fs')
const path = require('path');

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

function generateReport() {
	fs.writeFile(`top-earners-report/pending-withdraw-details.txt`, '', function() {
		const writer = fs.createWriteStream(`top-earners-report/pending-withdraw-details.txt`, {
			flags: 'a' // 'a' means appending (old data will be preserved)
		});

		Withdrawal.find({ $or: [{ status: 0 }, { status: 1 }]}, (error, withdrawTxs) => {
			if(error) {
				console.log(error);
			} else {
				console.log(withdrawTxs.length);

				withdrawTxs.map((tx) => {
					const userId = tx.user_id;
					Users.findById(userId)
						.then((user) => {
							if(user){
								const userDetails = { 
									userId,
									name: user.full_name,
									email: user.email_id,
									date_registered: user.createdAt.toISOString()
								};

								PassiveMiningUserElapsedTimes.aggregate([
							        { $match: { user_id: userId } },
							        { $group: { _id: null, 
									            elapsed_pando_earned: { $sum: "$elapsed_pando_earned" }
									        } }
							    ]).then(result1 => {
							    	const passive_mining_elapsed_pando_earned = result1[0] ? result1[0].elapsed_pando_earned : 0;
							    	userDetails.passive_mining_elapsed_pando_earned = passive_mining_elapsed_pando_earned;

							    	UsersElapsedTime.aggregate([
								        { $match: { user_id: userId } },
								        { $group: { _id: null, 
										            elapsed_pando_earned: { $sum: "$elapsed_pando_earned" },
										            elapsed_time: { $sum: "$elapsed_time" }
										        } }
								    ]).then(result2 => {
								    	const elapsed_pando_earned = result2[0] ? result2[0].elapsed_pando_earned : 0;
								    	const elapsed_time = result2[0] ? result2[0].elapsed_time : 0;

								    	userDetails.elapsed_pando_earned = elapsed_pando_earned;
								    	userDetails.elapsed_time = elapsed_time;

								    	UsersElapsedTime.aggregate([
									        { $match: { ref_user_id: userId } },
									        { $group: { _id: null, 
											            referral_pando_earned: { $sum: "$referral_pando_earned" }
											        } }
									    ]).then(result2 => {
									    	const referral_pando_earned = result2[0] ? result2[0].referral_pando_earned : 0;

									    	userDetails.referral_pando_earned = referral_pando_earned;
									    	userDetails.total_earnings = userDetails.passive_mining_elapsed_pando_earned + userDetails.elapsed_pando_earned + userDetails.referral_pando_earned;

									    	Withdrawal.aggregate([
										        { $match: { user_id: userId } },
										        { $group: { _id: null, 
												            total_withdraw: { $sum: "$total_amount" }
												        } }
										    ]).then(async (result3) => {
										    	const total_withdraw = result3[0] ? result3[0].total_withdraw : 0;
										    	userDetails.total_withdraw = total_withdraw;

										    	UsersPlans.findOne({ user_id: userId })
										    		.sort({ _id: -1 })
										    		.then(userPlan => {
										    			let plan = 0;
										    			if(userPlan) {
										    				Plans.findById(userPlan.purchased_plan_id, (error, userPlanDetails) => {
										    					if(userPlanDetails) {
										    						plan = userPlanDetails.amount;
										    					}
										    					console.log(`${userDetails.email} - ${userDetails.total_earnings} - ${plan} - ${userDetails.total_earnings - userDetails.total_withdraw}`);
										    					writer.write(`${tx._id}%${tx.transaction_hash}%${tx.total_amount}%${tx.receiver_address}%${tx.status}%${userId}%${userDetails.email}%${userDetails.elapsed_time}%${userDetails.elapsed_pando_earned}%${userDetails.referral_pando_earned}%${userDetails.passive_mining_elapsed_pando_earned}%${userDetails.total_earnings}%${userDetails.total_withdraw}%${plan}\n`);
										    				});
										    			} else {
											    			console.log(`${userDetails.email} - ${userDetails.total_earnings} - ${plan} - ${userDetails.total_earnings - userDetails.total_withdraw}`);
											    			writer.write(`${tx._id}%${tx.transaction_hash}%${tx.total_amount}%${tx.receiver_address}%${tx.status}%${userId}%${userDetails.email}%${userDetails.elapsed_time}%${userDetails.elapsed_pando_earned}%${userDetails.referral_pando_earned}%${userDetails.passive_mining_elapsed_pando_earned}%${userDetails.total_earnings}%${userDetails.total_withdraw}%${plan}\n`);
										    			}
										    		})
										    		.catch(error => {
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

							    }).catch(error => {
							    	console.log(error);
							    });
							} else {
								console.log('****************************************** Invalid withdraw with user id - ' + userId + ' ******************************************');
							}
						}).catch(error => {
							console.log(error);
						});
				});
			}
		});
	});
}

dbConnection().then(() => {
	generateReport();
}).catch(error => { console.log('Something went wrong!') });