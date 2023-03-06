const mongoose = require('mongoose');
const errors = require('restify-errors');

const Users = mongoose.model('Users');
const UsersElapsedTime = mongoose.model('UsersElapsedTime');
const PassiveMiningUserElapsedTimes = mongoose.model('PassiveMiningUserElapsedTimes');
const UsersPassword = mongoose.model('UsersPassword');

const config = require('../../../config/config');
const { getPlanByUser } = require('./plans-manager');
const { saltAndHash } = require('./import-file-manager');

const { getPandoMined } = require('./dashboard-manager');

const errorMessages = {
	setPasswordUserNotFound: {
		EN: "User associated with the link does not exists",
		KR: "링크와 연결된 사용자가 존재하지 않습니다",
	}
}

const setPassword = function(req, callback) {
	const userId = req.params.userId;
	const lang = req.body.language;

	if(userId){
		Users.findById(userId, function(error, result) {
			if(error) {
				const err = new errors.PreconditionFailedError({
					statusCode: 404
				}, lang ? errorMessages.setPasswordUserNotFound[lang] : "User associated with the link does not exists");
				callback(err, null);
			} else {
				if(result){
					const password = req.body.password;
					if(password){
						UsersPassword.findOne({ user_id: userId }, function(error, resultPass) {
							if(resultPass) {
								saltAndHash(password)
									.then(saltHash => {
										const userPassModel = {
											user_password: saltHash.hash,
											salt: saltHash.salt
										}
										UsersPassword.updateOne({ _id: resultPass._id }, userPassModel, function(error, result) {
											if(error) {
												console.log(error);
												const err = new errors.InternalError({
													statusCode: 500,
												}, "Error occured while saving new password");
												callback(err, null);
											} else {
												callback(null, result);
											}
										});
									})
									.catch(error => {
										console.log(error);
										const err = new errors.InternalError({
											statusCode: 500,
										}, "Error occured while hashing new password");
										callback(err, null);
									});
							} else {
								saltAndHash(password)
									.then(saltHash => {
										const userPass = new UsersPassword({
											user_id: userId,
											user_password: saltHash.hash,
											salt: saltHash.salt
										});
										userPass.save(function(error, result){
											console.log(error);
											const err = new errors.InternalError({
												statusCode: 500,
											}, "Error occured while saving new password");
											callback(err, null);
										});
									})
									.catch(error => {
										console.log(error);
										const err = new errors.InternalError({
											statusCode: 500,
										}, "Error occured while hashing new password");
										callback(err, null);
									});
							}
						});
					} else {
						const err = new errors.PreconditionFailedError({
							statusCode: 412,
						}, "Missing body parameter - password");
						callback(err, null);
					}
				} else {
					const err = new errors.PreconditionFailedError({
						statusCode: 404,
					}, lang ? errorMessages.setPasswordUserNotFound[lang] : "User associated with the link does not exists");
					callback(err, null);
				}
			}
		});
	} else {
		const err = new errors.PreconditionFailedError({
			statusCode: 412,
		}, "Missing parameter - userId");
		callback(err, null);
	}
}

const updateUser = function(req, callback) {
	const userId = req.params.userId;

	if(userId){
		Users.findOne({ _id: userId, is_deleted: 0 })
			.then(user => {
				if(user){
					const userDoc = user._doc;
					if(req.body.full_name) userDoc.full_name = req.body.full_name;
					if(req.body.username) userDoc.username = req.body.username;
					if(req.body.country) userDoc.country = req.body.country;
					if(req.body.birthdate) userDoc.birthdate = req.body.birthdate;
					if(req.body.contact_number) userDoc.contact_number = req.body.contact_number;

					Users.updateOne({ _id: userId, is_deleted: 0 }, userDoc)
						.then(result => {
							callback(null, userDoc);
						})
						.catch(error => {
							const err = new errors.InternalError({
								statusCode: 500,
							}, "Database error while saving user details");
							callback(err, null);
						});
				}
			})
			.catch(error => {
				const err = new errors.InternalError({
					statusCode: 500,
				}, "User not found in the database");
				callback(err, null);
			});
	} else {
		const err = new errors.PreconditionFailedError({
			statusCode: 412,
		}, "Missing parameter - userId");
		callback(err, null);
	}
}

const getUser = function(req, callback) {
	const userId = req.params.userId;
	
	if(userId){
		Users.findOne({ _id: userId, is_deleted: 0 })
			.then(async (user) => {
				if(user){
					const userDoc = user._doc;

					//get total elapsed time and elapsed pando earned
					await getTotalElapsedTimeAndPandoEarned(user.id, null, null)
						.then(result => {
							userDoc.total_elapsed_time = result.elapsed_time;
							userDoc.total_elapsed_pando_earned = result.elapsed_pando_earned;
						})
						.catch(error => {
							callback(error, null);
						});

					if(userDoc.referral_by){
						await Users.findOne({ referral_code: userDoc.referral_by, is_deleted: 0 })
							.then(result => {
								if(result) {
									userDoc.referrer_name = result.full_name;
								} else {
									userDoc.referrer_name = '';
								}
							})
							.catch(error => {
								userDoc.referrer_name = '';
							});
					} else { userDoc.referrer_name = '' }

					await Users.countDocuments({ referral_by: userDoc.referral_code, is_deleted: 0 })
						.then(count => {
							userDoc.downline_count = count;
						})
						.catch(error => {
							userDoc.downline_count = 0;
						});

					await getPlanByUser(user.id)
						.then(plan => {
							userDoc.plan = plan;
						}).catch(error => {
							userDoc.plan = {};
						});

					userDoc.total_balance = 0;				

					callback(null, userDoc);
				}
			})
			.catch(error => {
				const err = new errors.InternalError({
					statusCode: 500,
				}, "User not found in the database");
				callback(err, null);
			});
	} else {
		const err = new errors.PreconditionFailedError({
			statusCode: 412,
		}, "Missing parameter - userId");
		callback(err, null);
	}
}

const getUsers = function(req, callback){
	const offset = parseInt(req.query.offset) || 0;
	const limit = parseInt(req.query.limit) || 10;

	const query = { is_deleted: 0 };

	if(req.query.referral_by){
		query.referral_by = req.query.referral_by;
	}

	const queryOr = [];

	if(req.query.full_name){
		queryOr.push({ full_name : { $regex: '.*' + req.query.full_name + '.*', $options: 'i' } });
	}
	if(req.query.email_id){
		queryOr.push({ email_id: req.query.email_id });
	}

	if(queryOr.length){
		query['$or'] = queryOr;
	}

	const results = {}

	Users.countDocuments(query).then(count => { 
		results.total_rows = count;

		Users.find(query).sort({ 'createdAt': -1 }).limit(limit).skip(offset)
			.then(users => {
				const updatedUsers = [];
				
				const setOtherValues = users.map(async (user) => {
					const userDoc = user._doc;

					//get total elapsed time and elapsed pando earned
					await getTotalElapsedTimeAndPandoEarned(user.id, null, null)
						.then(result => {
							userDoc.total_elapsed_time = result.elapsed_time;
							userDoc.total_elapsed_pando_earned = result.elapsed_pando_earned;
						})
						.catch(error => {
							callback(error, null);
						});

					if(userDoc.referral_by){
						await Users.findOne({ referral_code: userDoc.referral_by, is_deleted: 0 })
							.then(result => {
								if(result) {
									userDoc.referrer_name = result.full_name;
								} else {
									userDoc.referrer_name = '';
								}
							})
							.catch(error => {
								userDoc.referrer_name = '';
							});
					} else { userDoc.referrer_name = '' }

					await Users.countDocuments({ referral_by: userDoc.referral_code, is_deleted: 0 })
						.then(count => {
							userDoc.downline_count = count;
						})
						.catch(error => {
							userDoc.downline_count = 0;
						});

					await getPlanByUser(user.id)
						.then(plan => {
							userDoc.plan = plan;
						}).catch(error => {
							userDoc.plan = {};
						});

					userDoc.total_balance = 0;
					updatedUsers.push(userDoc);
				});

				Promise.all(setOtherValues).then(() => {
					updatedUsers.sort(function(a, b) {
						if(a.createdAt < b.createdAt){
							return 1;
						}else if(a.createdAt > b.createdAt){
							return -1;
						}else{
							return 0;
						}
					});

					results.users = updatedUsers;
					results.last_updated = null;

					Users.find({ is_deleted: 0 }).sort({ updatedAt: -1 }).limit(1).skip(0)
						.then(lastUpdatedUser => {
							if(lastUpdatedUser.length){
								results.last_updated = lastUpdatedUser[0].updatedAt;
							}
							callback(null, results);
						})
						.catch(error => {
							callback(null, results);
						});

				}).catch(error => {
					const err = new errors.InternalError({
						statusCode: 500
					}, "Error while fetching list of users");
					callback(err, null);
				});
			})
			.catch(error => {
				const err = new errors.InternalError({
					statusCode: 500
				}, "Error while fetching list of users");
				callback(err, null);
			});
	}).catch(error => {
		const err = new errors.InternalError({
			statusCode: 500
		}, "Error while fetching the total rows");
		callback(err, null);
		return;
	});
}

const getUsersStatistics = function(req, callback) {
	const today = new Date();
	const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));

	const results = {};

	getTotalUsers(utcToday, function(error, result) {
		if(error){
			callback(error, null);
		} else {
			results.total_users = result.total_users;
			results.total_new_users = result.total_new_users;

			getActiveUsers(utcToday, function(error, result){
				if(error){
					callback(error, null);
				} else {
					results.total_active_users = result.total_active_users;
					results.active_users_percent_increase = result.active_users_percent_increase;

					Users.find({ is_deleted : 0 })
						.then(result => {
							const codes = [];
							result.map(r => { if(r.referral_by) codes.push(r.referral_by) });

							Users.countDocuments({ referral_code: { $nin: codes }, is_deleted: 0 })
								.then(count => {
									if(count) {
										results.total_no_referral_users_count = count;
									} else {
										results.total_no_referral_users_count = 0;
									}

									results.total_pando_mined = 0;
									results.pando_mined_percent_increase = 0;

									callback(null, results);

									// getPandoMined(utcToday, (error, result) => {
									// 	if(result) {
									// 		results.total_pando_mined = result.total_pando_mined;
									// 		results.pando_mined_percent_increase = result.pando_mined_percent_increase;
									// 	}

									// 	callback(null, results);
									// });
								})
								.catch(error => {
									const err = new errors.InternalError({
										statusCode: 500
									}, "Error while fetching count of users with no referrals");
									callback(err, null);
									return;
								});
						})
						.catch(error => {
							const err = new errors.InternalError({
								statusCode: 500
							}, "Error while fetching count of users with no referrals");
							callback(err, null);
							return;
						});
				}
			});
		}
	});
}

const getTotalUsers = function(utcToday, callback) {
	Users.countDocuments({ is_deleted: 0, createdAt: { "$lt": utcToday } })
		.then(countAsOfYesterday => {
			Users.countDocuments({ is_deleted: 0, createdAt: { "$gte": utcToday } })
				.then(countToday => {
					callback(null, { 
						total_users: countAsOfYesterday + countToday,
						total_new_users: countToday
					});
				})
				.catch(error => {
					const err = new errors.InternalError({
						statusCode: 500
					}, "Error while fetching the total users");
					callback(err, null);
				});
		})
		.catch(error => {
			const err = new errors.InternalError({
				statusCode: 500
			}, "Error while fetching the total users");
			callback(err, null);
		});
}

const getActiveUsers = function(utcToday, callback) {
	Users.countDocuments({ is_deleted: 0, activated: true, createdAt: { "$lt": utcToday } })
		.then(countAsOfYesterday => {
			Users.countDocuments({ is_deleted: 0, activated: true, createdAt: { "$gte": utcToday } })
				.then(countToday => {
					callback(null, { 
						total_active_users: countAsOfYesterday + countToday,
						active_users_percent_increase: (countToday / countAsOfYesterday) * 100
					});
				})
				.catch(error => {
					const err = new errors.InternalError({
						statusCode: 500
					}, "Error while fetching the total active users");
					callback(err, null);
				});
		})
		.catch(error => {
			const err = new errors.InternalError({
				statusCode: 500
			}, "Error while fetching the total active users");
			callback(err, null);
		});
}

const getReferralEarningLogs = function(req, callback) {
	const offset = parseInt(req.query.offset) || 0;
	const limit = parseInt(req.query.limit) || 10;

	const userId = req.params.userId;

	let fromDate = null;
	let toDate = null;

	if(req.query.fromDate && req.query.toDate){
		fromDate = new Date(parseFloat(req.query.fromDate));
		toDate = new Date(parseFloat(req.query.toDate));
	}

	const results = {};

	if(userId) {
		const match = { ref_user_id: userId };

		if(fromDate && toDate){
			match.createdAt = { "$gte": fromDate, "$lte": toDate }
		}

		UsersElapsedTime.aggregate([
	        { $match: match },
	        { $group: { _id: null, 
			            referral_pando_earned: { $sum: "$referral_pando_earned" }, 
			            elapsed_pando_earned: { $sum: "$elapsed_pando_earned" },
			            booster_elapsed_pando_earned: { $sum: "$booster_elapsed_pando_earned" }
			        } }
	    ], function(error, result){
	    	if(error) {
	    		const err = new errors.InternalError({
	    			statusCode: 500
	    		}, "Error while fetching referral earning logs");
	    		callback(err, null);
	    	} else {
	    		const referral_pando_earned = result[0] ? result[0].referral_pando_earned : 0;
	        	const elapsed_pando_earned = result[0] ? result[0].elapsed_pando_earned : 0;
	        	const booster_elapsed_pando_earned = result[0] ? result[0].booster_elapsed_pando_earned : 0;
	        	const base_rate_elapsed_pando_earned = elapsed_pando_earned - booster_elapsed_pando_earned;

	        	results.referral_pando_earned = referral_pando_earned;
	        	results.base_rate_elapsed_pando_earned = base_rate_elapsed_pando_earned;

	        	const query = { ref_user_id: userId };

	        	UsersElapsedTime.countDocuments(query, (error, count) => {
	        		if(error) {
	        			const err = new errors.InternalError({
			    			statusCode: 500
			    		}, "Error while fetching referral earning logs");
			    		callback(err, null);
	        		} else {
	        			results.total_rows = count;
	        			UsersElapsedTime.find(query)
	        				.sort({ 'createdAt': -1 })
							.limit(limit)
							.skip(offset)
							.then(logs => {
								results.logs = logs;
			        			callback(null, results);
							})
							.catch(error => {
								const err = new errors.InternalError({
					    			statusCode: 500
					    		}, "Error while fetching referral earning logs");
					    		callback(err, null);
							});
	        		}
	        	});
	    	}
	    });
	} else {
		const err = new errors.MissingParameterError({
			statusCode: 409,
		}, "Missing parameter - userId");
		callback(err, null);
	}
}

const getPassiveMiningHistory = function(req, callback) {
	const userId = req.params.userId;

	if(userId){
		PassiveMiningUserElapsedTimes.find({ user_id: userId }).sort({ elapsed_datetime: -1 })
			.then(logs => {
				callback(null, logs);
			})
			.catch(error => {
				const err = new errors.InternalError({
					statusCode: 500
				}, "Error while fetching passive mining logs");
				callback(err, null);
			});
	} else {
		const err = new errors.MissingParameterError({
			statusCode: 409,
		}, "Missing parameter - userId");
		callback(err, null);
	}
}

const getPassiveMiningHistoryV2 = function(req, callback) {
	const offset = parseInt(req.query.offset) || 0;
	const limit = parseInt(req.query.limit) || 10;

	const userId = req.params.userId;

	let fromDate = null;
	let toDate = null;

	if(req.query.fromDate && req.query.toDate){
		fromDate = new Date(parseFloat(req.query.fromDate));
		toDate = new Date(parseFloat(req.query.toDate));
	}

	const results = {};

	if(userId){
		// total
		getTotalPassiveMiningElapsedTimeAndPandoEarned(userId, fromDate, toDate, (error, result) => {
			if(error) {
				callback(error, null);
			} else {
				results.total = result;
				// logs
				getPassiveMiningHistoryLog(userId, fromDate, toDate, offset, limit, (error, result) => {
					if(error) {
						callback(error, null);
					} else {
						results.total_rows = result.count;
						results.logs = result.logs;
						callback(null, results);
					}
				});
			}
		});
	} else {
		const err = new errors.MissingParameterError({
			statusCode: 409,
		}, "Missing parameter - userId");
		callback(err, null);
	}
}

const getTotalPassiveMiningElapsedTimeAndPandoEarned = function(user_id, fromDate, toDate, callback) {
	let match = { $match: { user_id: user_id } };

	if(fromDate && toDate){
		match = { $match: { user_id: user_id, elapsed_datetime: { "$gte": fromDate, "$lte": toDate } } };
	}

    PassiveMiningUserElapsedTimes.aggregate([
        match,
        { $group: { _id: null, 
		            elapsed_time: { $sum: "$elapsed_time" }, 
		            elapsed_pando_earned: { $sum: "$elapsed_pando_earned" }
		        } }
    ], function(error, result){
    	if(error){
    		const err = new errors.InternalError({
    			statusCode: 500
    		}, "Error while fetching the total time and pando earned");
    		callback(err, null);
    	}else{
    		const elapsed_time = result[0] ? result[0].elapsed_time : 0;
        	const elapsed_pando_earned = result[0] ? result[0].elapsed_pando_earned : 0;
        	callback(null, { elapsed_time, elapsed_pando_earned });
    	}
    });
}

const getPassiveMiningHistoryLog = function(user_id, fromDate, toDate, offset, limit, callback) {
	let query = { user_id: user_id };

	if(fromDate && toDate){
		query = {user_id: user_id, elapsed_datetime: { "$gte": fromDate, "$lte": toDate }}
	}

	PassiveMiningUserElapsedTimes.countDocuments(query, (error, count) => {
		if(error) {
			const err = new errors.InternalError({
				statusCode: 500
			}, "Error while fetching total rows of the mining history logs");
			callback(err, null);
		} else {
			PassiveMiningUserElapsedTimes.find(query, 'createdAt elapsed_datetime elapsed_datetime_end mining_rate elapsed_time elapsed_pando_earned')
				.sort({ 'elapsed_datetime': -1 })
				.limit(limit)
				.skip(offset)
				.then(logs => {
					callback(null, { count, logs });
				}).catch(error => {
					const err = new errors.InternalError({
						statusCode: 500
					}, "Error while fetching the mining history logs");
					callback(err, null);
				});
		}
	});
}

const getMiningHistory = function(req, callback) {
	const offset = parseInt(req.query.offset) || 0;
	const limit = parseInt(req.query.limit) || 10;

	const userId = req.params.userId;

	let fromDate = null;
	let toDate = null;

	if(req.query.fromDate && req.query.toDate){
		fromDate = new Date(parseFloat(req.query.fromDate));
		toDate = new Date(parseFloat(req.query.toDate));
	}

	const results = {};
	if(userId){
		Users.findOne({ _id: userId })
			.then(user => {
				results.user = user;
				getTotalElapsedTimeAndPandoEarned(
					user.id, fromDate, toDate)
					.then(result => {
						results.total = result;
						getMiningHistoryLog(
							user.id, fromDate, toDate, offset, limit, function(error, result){
								if(error){
									callback(error, null);
								}else{
									results.total_rows = result.count;
									results.logs = result.logs;
									callback(null, results);
								}
						});
					})
					.catch(error => {
						callback(error, null);
					});
			})
			.catch(error => {
				const err = new errors.PreconditionFailedError({
					statusCode: 402
				}, "User does not exist");
				callback(err, null);
			});
	}else{
		const err = new errors.MissingParameterError({
			statusCode: 409,
		}, "Missing parameter - userId");
		callback(err, null);
	}
}

const deleteUser = function(req, callback) {
	const userId = req.params.userId;
	if(userId){
		Users.findOne({ _id: userId, is_deleted: 0 })
			.then(user => {
				user.is_deleted = 1;
				user.save()
					.then(result => {
						callback(null, { msg: "User successfully deleted" });
					})
					.catch(error => {
						const err = new errors.InternalError({
							statusCode: 500
						}, "Error deleting user");
						callback(err, null);
					});
			})
			.catch(error => {
				const err = new errors.PreconditionFailedError({
					statusCode: 402
				}, "User does not exist");
				callback(err, null);
			});
	} else {
		const err = new errors.MissingParameterError({
			statusCode: 409,
		}, "Missing parameter - userId");
		callback(err, null);
	}
}

const getMiningHistoryLog = function(user_id, fromDate, toDate, offset, limit, callback) {
	let query = { user_id: user_id };
	if(fromDate && toDate){
		query = {user_id: user_id, createdAt: { "$gte": fromDate, "$lte": toDate }}
	}
	UsersElapsedTime.countDocuments(query)
		.then(count => {
			UsersElapsedTime.find(query, 'createdAt mining_rate elapsed_time elapsed_pando_earned booster_elapsed_pando_earned')
				.sort({ 'createdAt': -1 })
				.limit(limit)
				.skip(offset)
				.then(logs => {
					callback(null, { count, logs });
				}).catch(error => {
					const err = new errors.InternalError({
						statusCode: 500
					}, "Error while fetching the mining history logs");
					callback(err, null);
				});
		})
		.catch(error => {
			const err = new errors.InternalError({
				statusCode: 500
			}, "Error while fetching total rows of the mining history logs");
			callback(err, null);
		});
}

const getTotalElapsedTimeAndPandoEarned = function(user_id, fromDate, toDate) {
	return new Promise((resolve, reject) => {
		let match = { $match: { user_id: user_id } };
		if(fromDate && toDate){
			match = { $match: { user_id: user_id, createdAt: { "$gte": fromDate, "$lte": toDate } } };
		}
	    UsersElapsedTime.aggregate([
	        match,
	        { $group: { _id: null, 
			            elapsed_time: { $sum: "$elapsed_time" }, 
			            elapsed_pando_earned: { $sum: "$elapsed_pando_earned" },
			            booster_elapsed_pando_earned: { $sum: "$booster_elapsed_pando_earned" }
			        } }
	    ], function(error, result){
	    	if(error){
	    		const err = new errors.InternalError({
	    			statusCode: 500
	    		}, "Error while fetching the total time and pando earned");
	    		reject(err);
	    	}else{
	    		const elapsed_time = result[0] ? result[0].elapsed_time : 0;
	        	const elapsed_pando_earned = result[0] ? result[0].elapsed_pando_earned : 0;
	        	const booster_elapsed_pando_earned = result[0] ? result[0].booster_elapsed_pando_earned : 0;
	        	const base_rate_elapsed_pando_earned = elapsed_pando_earned - booster_elapsed_pando_earned;
	        	resolve({ elapsed_time, elapsed_pando_earned, base_rate_elapsed_pando_earned });
	    	}
	    });
	});
}

module.exports = { 
	getMiningHistory, 
	getUsers, 
	getUsersStatistics, 
	deleteUser, 
	getUser, 
	updateUser, 
	setPassword, 
	getPassiveMiningHistory, 
	getReferralEarningLogs 
}