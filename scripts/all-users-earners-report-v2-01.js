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

function askAsOfDate() {
	rl.question('From (mm/dd/yyyy): ', fromDateStr => {
		rl.question('To (mm/dd/yyyy): ', toDateStr => {
			generateReport(fromDateStr, toDateStr);
		});
	});
}

function convertToUtc(dateStr, hh, m, ss, ms) {
	const arr = dateStr.split('/');
	const mm = parseInt(arr[0]);
	const dd = parseInt(arr[1]);
	const yyyy = parseInt(arr[2]);

	const d = new Date(yyyy, mm-1, dd, hh, m, ss, ms);
	d.setHours(d.getHours() - 9);

	return d;
}

function writeDetails(writer, userDetails) {
	userDetails.total_earnings = userDetails.passive_mining_elapsed_pando_earned + userDetails.elapsed_pando_earned + userDetails.referral_pando_earned;

	console.log(`${userDetails.email} - ${userDetails.total_earnings}`);
	writer.write(`${userDetails.email}%${userDetails.elapsed_pando_earned}%${userDetails.referral_pando_earned}%${userDetails.passive_mining_elapsed_pando_earned}%${userDetails.total_earnings}%${userDetails.planAmount}\n`);
}

function generateReport(fromDateStr, toDateStr) {
	const fromDate = convertToUtc(fromDateStr, 0, 0, 0, 0);
	const toDate = convertToUtc(toDateStr, 23, 59, 59, 999);

	console.log(fromDate.toISOString(), toDate.toISOString());

	fs.writeFile(`top-earners-report/all-users-earners-report-v2-01.txt`, '', function() {
		const writer = fs.createWriteStream(`top-earners-report/all-users-earners-report-v2-01.txt`, {
			flags: 'a' // 'a' means appending (old data will be preserved)
		});

		Users.find({ createdAt: { "$lte": toDate }, is_deleted: 0 }, (error, users) => {
			if(error) {
				console.log(error);
			} else {
				console.log(`Number of Users: ${users.length}`);

				users.map((user) => {
					const userId = user._id.toString();

					const userDetails = { 
						userId,
						name: user.full_name,
						email: user.email_id,
						date_registered: user.createdAt.toISOString()
					};

			    	UsersElapsedTime.aggregate([
				        { $match: { user_id: userId, createdAt: { "$gte": fromDate,"$lte": toDate } } },
				        { $group: { _id: null, 
						            elapsed_pando_earned: { $sum: "$elapsed_pando_earned" }
						        } }
				    ]).then(result2 => {
				    	const elapsed_pando_earned = result2[0] ? result2[0].elapsed_pando_earned : 0;

				    	userDetails.elapsed_pando_earned = elapsed_pando_earned;

				    	UsersElapsedTime.aggregate([
					        { $match: { ref_user_id: userId, createdAt: { "$gte": fromDate,"$lte": toDate } }  },
					        { $group: { _id: null, 
							            referral_pando_earned: { $sum: "$referral_pando_earned" }
							        } }
					    ]).then(result2 => {
					    	const referral_pando_earned = result2[0] ? result2[0].referral_pando_earned : 0;

					    	userDetails.referral_pando_earned = referral_pando_earned;

					    	UsersPlans.findOne({ user_id: userId, purchased_date: { "$lte": toDate }})
					    		.sort({ _id: -1 })
					    		.then(userPlan => {
					    			let planAmount = 0;
					    			if(userPlan) {
					    				Plans.findById(userPlan.purchased_plan_id)
					    					.then(plan => {
					    						if(plan){
					    							userDetails.planAmount = plan.amount;

					    							PassiveMiningUserElapsedTimes.findOne({ user_id: userId, elapsed_datetime: { "$lte": toDate }}).sort({ _id: -1 }).then(latestLog => {
														if(latestLog) {
															if(latestLog.elapsed_datetime.getTime() < fromDate.getTime()) { // if latest log is before fromDate
																const elapsedTimeFromLatestToFromDate = parseFloat((fromDate.getTime() - latestLog.elapsed_datetime.getTime()) / 1000);
																const pandoFromLatestToFromDate = parseFloat(parseFloat(latestLog.mining_rate) * (elapsedTimeFromLatestToFromDate / 60));

																const elapsedTimeFromLatestToToDate = parseFloat((toDate.getTime() - latestLog.elapsed_datetime.getTime()) / 1000);
																let pandoFromLatestToToDate = parseFloat(parseFloat(latestLog.mining_rate) * (elapsedTimeFromLatestToToDate / 60));

																if(latestLog.elapsed_pando_earned <= pandoFromLatestToToDate) {
																	pandoFromLatestToToDate = latestLog.elapsed_pando_earned;
																}

																const actualPandoEarned = pandoFromLatestToToDate - pandoFromLatestToFromDate;
																userDetails.passive_mining_elapsed_pando_earned = actualPandoEarned < 0 ? 0 : actualPandoEarned;
																
																writeDetails(writer, userDetails);
															} else if(latestLog.elapsed_datetime.getTime() >= fromDate.getTime()
																&& latestLog.elapsed_datetime.getTime() <= toDate.getTime()) { // if latest log is between fromDate and toDate

																const elapsedTimeFromLatestToToDate = parseFloat((toDate.getTime() - latestLog.elapsed_datetime.getTime()) / 1000);
																const pandoFromLatestToToDate = parseFloat(parseFloat(latestLog.mining_rate) * (elapsedTimeFromLatestToToDate / 60));
																let excessPandoFromLatestEntry = latestLog.elapsed_pando_earned - pandoFromLatestToToDate;
																excessPandoFromLatestEntry = excessPandoFromLatestEntry < 0 ? 0 : excessPandoFromLatestEntry;

																PassiveMiningUserElapsedTimes.aggregate([
																        { $match: { user_id: userId, elapsed_datetime: { "$gte": fromDate, "$lte": toDate } } },
																        { $group: { _id: null, 
																		            elapsed_pando_earned: { $sum: "$elapsed_pando_earned" }
																		        } }
																    ]).then(result3 => {
																    	let passive_mining_elapsed_pando_earned = result3[0] ? result3[0].elapsed_pando_earned : 0;

																    	if(latestLog.elapsed_pando_earned == 0 
																    		&& latestLog.elapsed_datetime.getDate() == 28
																    		&& latestLog.elapsed_datetime.getMonth() == 1) {
																    		passive_mining_elapsed_pando_earned += pandoFromLatestToToDate;
																    	}

																    	PassiveMiningUserElapsedTimes.findOne({ user_id: userId, elapsed_datetime: { "$lte": fromDate }}).sort({ _id: -1 })
																			.then(latestLogBeforeFromDate => {
																				if(latestLogBeforeFromDate) {
																					PassiveMiningUserElapsedTimes.findOne({ user_id: userId, elapsed_datetime: { "$gte": fromDate }}).sort({ _id: 1 })
																						.then(logAfterFromDate => {
																							if(logAfterFromDate) {
																								const elapsedTimeFromFromDateToAfterFromDate = parseFloat((logAfterFromDate.elapsed_datetime.getTime() - fromDate.getTime()) / 1000);
																								const pandoFromFromDateToAfterFromDate = parseFloat(parseFloat(latestLogBeforeFromDate.mining_rate) * (elapsedTimeFromFromDateToAfterFromDate / 60));

																								userDetails.passive_mining_elapsed_pando_earned = (passive_mining_elapsed_pando_earned + pandoFromFromDateToAfterFromDate) - excessPandoFromLatestEntry;
																								writeDetails(writer, userDetails);
																							} else {
																								userDetails.passive_mining_elapsed_pando_earned = passive_mining_elapsed_pando_earned - excessPandoFromLatestEntry;
																								writeDetails(writer, userDetails);
																							}
																						}).catch(error => {
																							console.log(error);
																						});
																				} else {
																					userDetails.passive_mining_elapsed_pando_earned = passive_mining_elapsed_pando_earned - excessPandoFromLatestEntry;
																					writeDetails(writer, userDetails);
																				}
																			}).catch(error => {
																				console.log(error);
																			});
																    }).catch(error => {
																    	console.log(error);
																    });
															}
														} else {
															userDetails.passive_mining_elapsed_pando_earned = 0;
															writeDetails(writer, userDetails);
														}
								    				}).catch(error => {
								    					console.log(error);
								    				})
					    						} else {
					    							userDetails.passive_mining_elapsed_pando_earned = 0;
								    				userDetails.planAmount = 0;

								    				writeDetails(writer, userDetails);
					    						}
					    					})
					    					.catch(error => {
					    						console.log(error);
					    					});
					    			} else {
					    				userDetails.passive_mining_elapsed_pando_earned = 0;
					    				userDetails.planAmount = 0;

					    				writeDetails(writer, userDetails);
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
				});
			}
		});
	});
}

dbConnection().then(() => {
	askAsOfDate();
}).catch(error => { console.log('Something went wrong!') });