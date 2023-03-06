const mongoose = require('mongoose');
const errors = require('restify-errors');

const Users = mongoose.model('Users');
const UsersElapsedTime = mongoose.model('UsersElapsedTime');
const PassiveMiningUserElapsedTimes = mongoose.model('PassiveMiningUserElapsedTimes');

const config = require('../../../config/config');

const getStatistics = function(req, callback) {
	const today = new Date();
	const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));

	const results = {};

	getTotalUsers(utcToday, function(error, result) {
		if(error) {
			callback(error, null);
		} else {
			results.total_users = result.total_users;
			results.total_new_users = result.total_new_users;
			getPandoMined(utcToday, function(error, result) {
				if(error) {
					callback(error, null);
				} else {
					results.total_pando_mined = result.total_pando_mined;
					results.pando_mined_percent_increase = result.pando_mined_percent_increase;
					callback(null, results);
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

const getPandoMined = function(utcToday, callback) {
	UsersElapsedTime.aggregate([
			{ $match: { createdAt: { "$lt": utcToday } } },
			{ $group: {
					_id: null,
					elapsed_pando_earned: { $sum: "$elapsed_pando_earned" },
					referral_pando_earned: { $sum: "$referral_pando_earned" }
				}
			}
		]).then(result => {
			const pandoMinedAsOfYesterday = result[0] ? (result[0].elapsed_pando_earned || 0) + (result[0].referral_pando_earned || 0) : 0;
			UsersElapsedTime.aggregate([
					{ $match: { createdAt: { "$gte": utcToday } } },
					{ $group: {
							_id: null,
							elapsed_pando_earned: { $sum: "$elapsed_pando_earned" },
							referral_pando_earned: { $sum: "$referral_pando_earned" }
						}
					}
				]).then(res => {
					const pandoMinedToday = res[0] ? (res[0].elapsed_pando_earned || 0) + (res[0].referral_pando_earned || 0) : 0;
					
					PassiveMiningUserElapsedTimes.aggregate([
							{ $match: { elapsed_datetime: { "$lt": utcToday } } },
							{ $group: {
									_id: null,
									elapsed_pando_earned: { $sum: "$elapsed_pando_earned" }
								}
							}
						], (error, result) => {
							const passivePandoMinedAsOfYesterday = result[0] ? (result[0].elapsed_pando_earned || 0) : 0;

							PassiveMiningUserElapsedTimes.aggregate([
									{ $match: { elapsed_datetime: { "$gte": utcToday } } },
									{ $group: {
											_id: null,
											elapsed_pando_earned: { $sum: "$elapsed_pando_earned" }
										}
									}
								], (error, result) => {
									const passivePandoMinedToday = result[0] ? (result[0].elapsed_pando_earned || 0) : 0;

									const totalYesterday = pandoMinedAsOfYesterday + passivePandoMinedAsOfYesterday;
									const totalToday = pandoMinedToday + passivePandoMinedToday;
									const percentIncrease = totalYesterday ? ((totalToday / totalYesterday) * 100) : 100;

									callback(null, {
										total_pando_mined: totalYesterday + totalToday,
										pando_mined_percent_increase: percentIncrease
									});
								});
						});
				}).catch(error => {
					const err = new errors.InternalError({
						statusCode: 500
					}, "Error while fetching total pando earned");
					callback(err, null);
				});
		}).catch(error => {
			const err = new errors.InternalError({
				statusCode: 500
			}, "Error while fetching total pando earned");
			callback(err, null);
		});
}

const getRecentTransactions = function(req, callback) {
	const offset = parseInt(req.query.offset) || 0;
	const limit = parseInt(req.query.limit) || 10;

	UsersElapsedTime.find()
		.sort({ 'createdAt': -1 })
		.limit(limit)
		.skip(offset)
		.then(logs => {
			const updatedLogs = [];

			const setOtherValuesPerLog = logs.map(async (log) => {
				const logDoc = log._doc;

				//set per log values here
				const mininglog = {
					transaction_type: "Runtime Mining",
					time: logDoc.elapsed_time,
					pando_earned: logDoc.elapsed_pando_earned,
					rate: logDoc.mining_rate,
					transaction_date: logDoc.createdAt
				}

				await Users.findOne({ _id: logDoc.user_id })
					.then(user => {
						if(user) mininglog.user = user.full_name;
					}).catch(error => {
						const err = new errors.InternalError({
							statusCode: 500
						}, "Error while fetching name of the user");
						callback(err, null);
					})

				updatedLogs.push(mininglog);

				if(logDoc.ref_user_id){
					const refLog = {
						transaction_type: "Referral Earning",
						time: logDoc.elapsed_time,
						pando_earned: logDoc.referral_pando_earned,
						rate: logDoc.ref_rate,
						transaction_date: logDoc.createdAt
					}

					await Users.findOne({ _id: logDoc.ref_user_id })
						.then(user => {
							if(user) refLog.user = user.full_name;
						}).catch(error => {
							const err = new errors.InternalError({
								statusCode: 500
							}, "Error while fetching name of the user");
							callback(err, null);
						})

					updatedLogs.push(refLog);
				}
			});

			Promise.all(setOtherValuesPerLog).then(() => {
				updatedLogs.sort(function(a, b) {
					if(a.transaction_date < b.transaction_date){
						return 1;
					}else if(a.transaction_date > b.transaction_date){
						return -1;
					}else{
						return 0;
					}
				});
				callback(null, { logs: updatedLogs.slice(0, limit) });
			}).catch(error => {
				const err = new errors.InternalError({
					statusCode: 500
				}, "Error while fetching recent transactions");
				callback(err, null);
			});
		}).catch(error => {
			const err = new errors.InternalError({
				statusCode: 500
			}, "Error while fetching recent transactions");
			callback(err, null);
		});
}

module.exports = { getStatistics, getRecentTransactions, getPandoMined }