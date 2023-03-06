const mongoose = require('mongoose');
const UserPlans = require('../../models/userPlans');
const Plans = require('../../models/plans');
const PassiveMiningUserElapsedTimes = require('../../models/passiveMiningUserElapsedTime');
const Users = require('../../models/users');

const updateMiningLogsWhenPlanPassivingMiningRateUpdatedv2 = (planId, newMiningRate) => {
	console.log('UPDATING PASSIVE MINING LOGS');
	UserPlans.find({ purchased_plan_id: planId }, (error, userIds) => {
		console.log(userIds.length);
		userIds.forEach((userId) => {
			UserPlans.findOne({ user_id: userId }, (error, currentPlan) => {
				if(error) {
					console.log('Passive Mining Error: ', error);
				} else {
					if(currentPlan) {
						if(currentPlan.purchased_plan_id == planId) {
							PassiveMiningUserElapsedTimes.findOne({ user_id: currentPlan.user_id }, function(error, latestMiningLog){
									if(error) {
										console.log('Passive Mining Error: ', error);
									} else {
										const elapsed_datetime_end = new Date();

										if(latestMiningLog) {
											if(latestMiningLog.usersplans_id == currentPlan._id) {
												if(newMiningRate != latestMiningLog.mining_rate) {
													latestMiningLog.elapsed_time = Math.round((elapsed_datetime_end.getTime() - latestMiningLog.elapsed_datetime.getTime()) / 1000);
													latestMiningLog.elapsed_pando_earned = parseFloat(parseFloat(latestMiningLog.mining_rate) * (latestMiningLog.elapsed_time / 60));
													latestMiningLog.elapsed_datetime_end = elapsed_datetime_end;

													PassiveMiningUserElapsedTimes.updateOne({ _id: latestMiningLog._id }, latestMiningLog, function(error, result) {
														if(error) {
															console.log('Passive Mining Error: ', error);
														} else {
															console.log('Passive Mining: ', 'Mining log for previous rate was successfully updated!', 
																`${latestMiningLog.user_id} - ${latestMiningLog.mining_rate} - ${latestMiningLog.elapsed_time} - ${latestMiningLog.elapsed_pando_earned}`);

															const newMiningLog = new PassiveMiningUserElapsedTimes({
																user_id: currentPlan.user_id,
																mining_rate: newMiningRate,
																elapsed_datetime: elapsed_datetime_end,
																elapsed_time: 0,
																elapsed_pando_earned: 0,
																elapsed_datetime_end: null,
																usersplans_id: currentPlan._id
															});

															newMiningLog.save(function(error, result) {
																if(error) {
																	console.log('Passive Mining Error: ', error);
																} else {
																	console.log('Passive Mining: ', 'New mining log for new rate was successfully added!', 
																		`${newMiningLog.user_id} - ${newMiningLog.mining_rate}`);
																}
															});
														}
													});
												}
											}
										}
									}
								}).sort({ 'elapsed_datetime': -1 });
						}
					}
				}
			}).sort({ 'purchased_date': -1 });
		});
	}).distinct('user_id');
}

const updateMiningLogsWhenPlanPassivingMiningRateUpdated = function(planId, newMiningRate) {
	console.log('UPDATING PASSIVE MINING LOGS');
	const usersDone = [];
	UserPlans.find({ purchased_plan_id: planId }, function(error, userPlans) {
		if(error) {
			console.log('Passive Mining Error: ', error);
		} else {
			if(userPlans.length){
				userPlans.forEach(userPlan => {
					UserPlans.findOne({ user_id: userPlan.user_id }, function(error, currentPlan) {
						if(error) {
							console.log('Passive Mining Error: ', error);
						} else {
							if(currentPlan.purchased_plan_id == userPlan.purchased_plan_id) { // UPDATED PLAN IS THE CURRENT PLAN OF THE USER
								PassiveMiningUserElapsedTimes.findOne({ user_id: currentPlan.user_id }, function(error, latestMiningLog){
									if(error) {
										console.log('Passive Mining Error: ', error);
									} else {
										const elapsed_datetime_end = new Date();

										if(latestMiningLog) {
											if(latestMiningLog.usersplans_id == currentPlan._id) {
												if(!usersDone.includes(latestMiningLog.user_id)) {
													usersDone.push(latestMiningLog.user_id);

													if(newMiningRate != latestMiningLog.mining_rate) {
														latestMiningLog.elapsed_time = Math.round((elapsed_datetime_end.getTime() - latestMiningLog.elapsed_datetime.getTime()) / 1000);
														latestMiningLog.elapsed_pando_earned = parseFloat(parseFloat(latestMiningLog.mining_rate) * (latestMiningLog.elapsed_time / 60));
														latestMiningLog.elapsed_datetime_end = elapsed_datetime_end;

														PassiveMiningUserElapsedTimes.updateOne({ _id: latestMiningLog._id }, latestMiningLog, function(error, result) {
															if(error) {
																console.log('Passive Mining Error: ', error);
															} else {
																console.log('Passive Mining: ', 'Mining log for previous rate was successfully updated!', 
																	`${latestMiningLog.user_id} - ${latestMiningLog.mining_rate} - ${latestMiningLog.elapsed_time} - ${latestMiningLog.elapsed_pando_earned}`);

																const newMiningLog = new PassiveMiningUserElapsedTimes({
																	user_id: currentPlan.user_id,
																	mining_rate: newMiningRate,
																	elapsed_datetime: elapsed_datetime_end,
																	elapsed_time: 0,
																	elapsed_pando_earned: 0,
																	elapsed_datetime_end: null,
																	usersplans_id: currentPlan._id
																});

																newMiningLog.save(function(error, result) {
																	if(error) {
																		console.log('Passive Mining Error: ', error);
																	} else {
																		console.log('Passive Mining: ', 'New mining log for new rate was successfully added!', 
																			`${newMiningLog.user_id} - ${newMiningLog.mining_rate}`);
																	}
																});
															}
														});
													}
												}
											}
										} else {
											// const newMiningLog = new PassiveMiningUserElapsedTimes({
											// 	user_id: currentPlan.user_id,
											// 	mining_rate: newMiningRate,
											// 	elapsed_datetime: currentPlan.createdAt,
											// 	elapsed_time: 0,
											// 	elapsed_pando_earned: 0,
											// 	elapsed_datetime_end: null,
											// 	usersplans_id: currentPlan._id
											// });

											// newMiningLog.save(function(error, result) {
											// 	if(error) {
											// 		console.log('Passive Mining: ', error);
											// 	} else {
											// 		console.log('Passive Mining: ', 'New mining log for new rate was successfully added!');
											// 	}
											// });
										}
									}
								}).sort({ 'elapsed_datetime': -1 });
							}
						}
					}).sort({ 'createdAt': -1 });
				});
			}
		}
	});
}

const updateMiningLogsWhenNewPlanIsPurchased = function(userPlan, miningRate) {
	PassiveMiningUserElapsedTimes.findOne({ user_id: userPlan.user_id }, function(error, latestMiningLog){
		if(error) {
			console.log('Passive Mining Error: ', error);
		} else {
			const elapsed_datetime_end = userPlan.purchased_date;

			if(latestMiningLog) {
				latestMiningLog.elapsed_time = Math.round((elapsed_datetime_end.getTime() - latestMiningLog.elapsed_datetime.getTime()) / 1000);
				latestMiningLog.elapsed_pando_earned = parseFloat(parseFloat(latestMiningLog.mining_rate) * (latestMiningLog.elapsed_time / 60));
				latestMiningLog.elapsed_datetime_end = elapsed_datetime_end;

				PassiveMiningUserElapsedTimes.updateOne({ _id: latestMiningLog._id }, latestMiningLog, function(error, result) {
					if(error) {
						console.log('Passive Mining Error: ', error);
					} else {
						console.log('Passive Mining: ', 'Mining log for previous plan was successfully updated!', 
							`${latestMiningLog.user_id} - ${latestMiningLog.mining_rate} - ${latestMiningLog.elapsed_time} - ${latestMiningLog.elapsed_pando_earned}`);

						const newMiningLog = new PassiveMiningUserElapsedTimes({
							user_id: userPlan.user_id,
							mining_rate: miningRate,
							elapsed_datetime: elapsed_datetime_end,
							elapsed_time: 0,
							elapsed_pando_earned: 0,
							elapsed_datetime_end: null,
							usersplans_id: userPlan._id
						});

						newMiningLog.save(function(error, result) {
							if(error) {
								console.log('Passive Mining Error: ', error);
							} else {
								console.log('Passive Mining: ', 'New mining log for new plan was successfully added!', 
									`${newMiningLog.user_id} - ${newMiningLog.mining_rate}`);
							}
						});
					}
				});
			} else {
				const newMiningLog = new PassiveMiningUserElapsedTimes({
					user_id: userPlan.user_id,
					mining_rate: miningRate,
					elapsed_datetime: userPlan.purchased_date,
					elapsed_time: 0,
					elapsed_pando_earned: 0,
					elapsed_datetime_end: null,
					usersplans_id: userPlan._id
				});

				newMiningLog.save(function(error, result) {
					if(error) {
						console.log('Passive Mining Error: ', error);
					} else {
						console.log('Passive Mining: ', 'New mining log for new plan was successfully added!');
					}
				});
			}
		}
	}).sort({ 'elapsed_datetime': -1 });
}

const createMiningLogs = function(lower, upper) {
	UserPlans.distinct('user_id', function(error, ids){
		console.log(ids.length);
		ids = ids.slice(lower, upper);
		ids.forEach(userId => {
			UserPlans.find({ user_id: userId }, function(error, userPlans) {
	            if(error) {
	                console.log(`Passive Mining Error: User ID - ${userId}`, error);
	            } else {
	                if(userPlans.length) {
	                	PassiveMiningUserElapsedTimes.findOne({ user_id: userId }, function(error, result) {
	                		if(!result) {
	                			for(let i = 0; i < userPlans.length; i++) {
			                        const userPlan = userPlans[i];

			                        PassiveMiningUserElapsedTimes.findOne({ usersplans_id: userPlan._id }, function(error, result) {
			                    		if(error) {
											console.log('Passive Mining Error: ', error);
										} else {
											if(!result) {
												Plans.findById(userPlan.purchased_plan_id, function(error, plan) {
				                                    if(error) {
				                                        console.log(`Passive Mining Error: User ID - ${userId}`, 'Error occured while fetching plan details of the user', error);
				                                    } else {
				                                        if(plan) {
				                                            const mining_rate = plan.passive_mining_rate;
				                                            let elapsed_datetime = null;
				                                            let elapsed_datetime_end = null;
				                                            let elapsed_time = 0;
				                                            let elapsed_pando_earned = 0;
				                                            const usersplans_id = userPlans[i]._id;

				                                            if(i === userPlans.length - 1) { // latest plan
				                                            	elapsed_datetime = userPlans[i].purchased_date;

				                                                const currentDateTime = new Date();

				                                                elapsed_time = Math.round((currentDateTime.getTime() - elapsed_datetime.getTime()) / 1000);
				                                           		elapsed_pando_earned = parseFloat(parseFloat(mining_rate) * (elapsed_time / 60));
				                                            } else {
				                                            	elapsed_datetime = userPlans[i].purchased_date;
				                                                elapsed_datetime_end = userPlans[i+1].purchased_date;
				                                                elapsed_time = Math.round((elapsed_datetime_end.getTime() - elapsed_datetime.getTime()) / 1000);
				                                           		elapsed_pando_earned = parseFloat(parseFloat(mining_rate) * (elapsed_time / 60));
				                                            }

				                                            const newMiningLog = new PassiveMiningUserElapsedTimes({
				                                                user_id: userId,
				                                                mining_rate,
				                                                elapsed_time,
				                                                elapsed_pando_earned,
				                                                elapsed_datetime,
				                                                elapsed_datetime_end,
				                                                usersplans_id
				                                            });

				                                            newMiningLog.save(function(error, result, numAffected){
				                                                if(error) {
				                                                    console.log(`Passive Mining Error: User ID - ${userId}`, 'Error occured while saving new mining log', error);
				                                                } else {
				                                                    console.log(`Passive Mining (new): User ID - ${userId}`, 'New mining log entry was succesfully created', `${mining_rate} - ${elapsed_time} - ${elapsed_pando_earned} - ${elapsed_datetime}`);
				                                                }
				                                            });
				                                        } else {
				                                            console.log(`Passive Mining Error: User ID - ${userId}`, 'Plan details was lost or deleted');
				                                        }
				                                    }
				                                });
											}
										}
			                        });
			                    }
	                		} else {
	                			console.log('Has mining logs already');
	                		}
	                	});
	                } else {
	                    console.log(`Passive Mining: User ID - ${userId}`, 'No plans');
	                }
	            }
	        }).sort({ 'purchased_date': 1 });
		});
	});
}

module.exports = { 
	updateMiningLogsWhenPlanPassivingMiningRateUpdated, 
	updateMiningLogsWhenPlanPassivingMiningRateUpdatedv2,
	updateMiningLogsWhenNewPlanIsPurchased, 
	createMiningLogs 
}