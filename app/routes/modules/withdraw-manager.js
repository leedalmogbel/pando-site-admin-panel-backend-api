const mongoose = require('mongoose');
const Withdrawal = mongoose.model('Withdrawal');
const Users = mongoose.model('Users');
const WithdrawIncrement = mongoose.model('WithdrawIncrement');

const Utils = require('../../common/Utils');
const { withdrawalStatus } = require('../../common/constants');

const config = require('../../../config/config');

const axios = require('axios');

const updateWithdrawStatus = (req, callback) => {
	const { payload } = req.body;

	if(payload){
		if(secret.password && secret.salt){
			try {
				const body = JSON.parse(Utils.decryptString(secret.password, secret.salt, payload));
				console.log('Update withdraw status', body);
				const { withdrawId, status, wallet, txId } = body;

				if(withdrawId){
					Withdrawal.updateOne({ _id: withdrawId }, { $set: 
						{ status: status, pando_hot_wallet_address: wallet, transaction_hash: txId }
					}, (error, result) => {
						if(error) {
							callback({
								code: 500,
								message: 'Error updating status'
							}, null);
						} else {
							callback(null, result);

							if(status == withdrawalStatus.SUCCEED) {
								// update withdraw status memory on pando api
								Withdrawal.findOne({ _id: withdrawId }, (error, withdrawTx) => {
									if(withdrawTx) {
										const userId = withdrawTx.user_id;

										session.save(userId, { withdraw_status: false }, (error, status) => {
											if(error) {
												log.error(`${userId} - ${error}`);
											} else {
												log.info(`Withdraw flag for ${userId} was updated to false`);
											}
										});
									} else {
										log.info(`Withdraw Tx not found - ${withdrawId}`);
									}
								});
							}
						}
					});
				} else {
					callback({
						code: 400,
						message: 'No withdraw ID provided'
					}, null);
				}
			} catch (error) {
				callback({
					code: 400,
					message: 'Key-pair mismatch'
				}, null);
			}
		} else {
			callback({
				code: 400,
				message: 'Missing key-pair'
			}, null);
		}
	} else {
		callback({
			code: 400,
			message: 'No payload'
		}, null);
	}
}

const getWithdrawTransactions = (req, callback) => {
	const offset = parseInt(req.query.offset) || 0;
	const limit = parseInt(req.query.limit) || 10;

	const query = {};

	Withdrawal.findOne({})
		.sort({ updatedAt: -1 })
		.exec((error, lastUpdatedRow) => {
			if(error) {
				callback({
					code: 500,
					message: 'Error fetching withdraw transaction'
				}, null);
			} else {
				let last_update_datetime = null;
				if(lastUpdatedRow){
					last_update_datetime = lastUpdatedRow.updatedAt;
				}

				Withdrawal.countDocuments(query, (error, count) => {
					if(error){
						callback({
							code: 500,
							message: 'Error fetching withdraw transactions'
						}, null);
					} else {
						Withdrawal.find(query)
							.sort({ createdAt: -1 })
							.limit(limit)
							.skip(offset)
							.exec((error, transactions) => {
								if(error) {
									callback({
										code: 500,
										message: 'Error fetching withdraw transactions'
									}, null);
								} else {
									const data = [];
									const getUserDetails = transactions.map(async (transaction) => {
										const tDoc = transaction._doc;

										await Users.findById(transaction.user_id, (error, user) => {
											if(user){
												tDoc.user = user.full_name;
											} else {
												tDoc.user = '';
											}
										});

										data.push(tDoc);
									});

									Promise.all(getUserDetails).then(() => {
										callback(null, {
											last_update_datetime,
											total_rows: count,
											transactions: data
										});
									});
								}
							});
					}
				});
			}
		});
}

const getWithdrawTransactionsStatistics = (req, callback) => {
	const today = new Date();
	const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));

	getEarnedTransactionFee(utcToday, withdrawalStatus.SUCCEED, (error, result) => {
		if(error) {
			callback(error, null);
		} else {
			const transactionFees = result.transaction_fee_earned;
			const transactionFeesToday = result.transaction_fee_earned_today;

			getTransactionsCount(withdrawalStatus.PENDING, (error, result) => {
				if(error) {
					callback(error, null);
				} else {
					const pending_transactions_count = result;

					getTotalAmountWithdrawn(utcToday, withdrawalStatus.SUCCEED, (error, result) => {
						if(error) {
							callback(error, null);
						} else {
							let totalAmount = result.total_amount;
							let totalAmounToday =  result.total_amount_today;

							getTotalWithdrawIncrement(utcToday, (error, withdrawIncrementResult) => {
								if(error) {
									callback(error, null);
								} else {
									totalAmount += withdrawIncrementResult.total_amount;
									totalAmounToday += withdrawIncrementResult.total_amount_today;

									const amountBeforeToday = totalAmount - totalAmounToday;
									let percent_increase = amountBeforeToday ? ((totalAmounToday / amountBeforeToday) * 100) : 100;

									if(totalAmounToday === 0){
										percent_increase = 0;
									}
									
									callback(null, {
										transaction_fee_earned: transactionFees,
										transaction_fee_earned_today: transactionFeesToday,
										pending_transactions_count,
										total_withdrawn_pando: totalAmount,
										percent_increase
									});
								}
							});
						}
					});
				}
			});
		}
	});
}

const getTotalWithdrawn = (req, callback) => {
	const today = new Date();
	const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));

	getTotalAmountWithdrawn(utcToday, withdrawalStatus.SUCCEED, (error, result) => {
		if(error) {
			callback(error, null);
		} else {
			let totalAmount = result.total_amount;
			let totalAmounToday =  result.total_amount_today;

			getTotalWithdrawIncrement(utcToday, (error, withdrawIncrementResult) => {
				if(error) {
					callback(error, null);
				} else {
					totalAmount += withdrawIncrementResult.total_amount;
					totalAmounToday += withdrawIncrementResult.total_amount_today;

					const amountBeforeToday = totalAmount - totalAmounToday;
					let percent_increase = amountBeforeToday ? ((totalAmounToday / amountBeforeToday) * 100) : 100;

					if(totalAmounToday === 0){
						percent_increase = 0;
					}
					
					callback(null, {
						total_withdrawn_pando: totalAmount,
						percent_increase
					});
				}
			});
		}
	});
}

const getTransactionsCount = (status, callback) => {
	Withdrawal.countDocuments({ status }, (error, count) => {
		if(error) {
			callback({
				code: 500,
				message: 'Error fetching transactions statistics'
			}, null);
		} else {
			callback(null, count);
		}
	});
}

const getEarnedTransactionFee = (today, status, callback) => {
	Withdrawal.aggregate([
		{ $match: { status }},
		{ $group: {
				_id: null,
				transaction_fee_amount: { $sum: "$transaction_fee_amount" }
			}
		}
	], (error, result) => {
		if(error) {
			callback({
				code: 500,
				message: 'Error fetching transactions statistics'
			}, null);
		} else {
			const transaction_fee_earned = result[0] ? result[0].transaction_fee_amount : 0;

			Withdrawal.aggregate([
				{ $match: { status, createdAt: { "$gte": today } } },
				{ $group: {
						_id: null,
						transaction_fee_amount: { $sum: "$transaction_fee_amount" }
					}
				}
			], (error, result) => {
				if(error) {
					callback({
						code: 500,
						message: 'Error fetching transactions statistics'
					}, null);
				} else {
					const transaction_fee_earned_today = result[0] ? result[0].transaction_fee_amount : 0;

					callback(null, { transaction_fee_earned, transaction_fee_earned_today });
				}
			});
		}
	});
}

const getTotalAmountWithdrawn = (today, status, callback) => {
	Withdrawal.aggregate([
		{ $match: { status }},
		{ $group: {
				_id: null,
				total_amount: { $sum: "$total_amount" }
			}
		}
	], (error, result) => {
		if(error) {
			callback({
				code: 500,
				message: 'Error fetching transactions statistics'
			}, null);
		} else {
			const total_amount = result[0] ? result[0].total_amount : 0;

			Withdrawal.aggregate([
				{ $match: { status, createdAt: { "$gte": today } } },
				{ $group: {
						_id: null,
						total_amount: { $sum: "$total_amount" }
					}
				}
			], (error, result) => {
				if(error) {
					callback({
						code: 500,
						message: 'Error fetching transactions statistics'
					}, null);
				} else {
					const total_amount_today = result[0] ? result[0].total_amount : 0;

					callback(null, { total_amount, total_amount_today });
				}
			});
		}
	});
}

const getTotalWithdrawIncrement = (today, callback) => {
	WithdrawIncrement.aggregate([
		{ $match: {} },
		{ $group: {
				_id: null,
				amount: { $sum: "$amount" }
			}
		}
	], (error, result) => {
		if(error) {
			callback({
				code: 500,
				message: 'Error fetching transactions statistics'
			}, null);
		} else {
			const total_amount = result[0] ? result[0].amount : 0;

			WithdrawIncrement.aggregate([
				{ $match: { createdAt: { "$gte": today } } },
				{ $group: {
						_id: null,
						amount: { $sum: "$amount" }
					}
				}
			], (error, result) => {
				if(error) {
					callback({
						code: 500,
						message: 'Error fetching transactions statistics'
					}, null);
				} else {
					const total_amount_today = result[0] ? result[0].amount : 0;

					callback(null, { total_amount, total_amount_today });
				}
			});
		}
	});
}

const addWithdrawIncrement = (req, callback) => {
	const amount = req.body ? (req.body.amount || 0) : 0;
	
	if(!amount) {
		callback({
			code: 400,
			message: 'Invalid Request'
		}, null);
		return;
	}

	const increment = new WithdrawIncrement({
		amount, user: req.session.email_id
	});

	increment.save((error, result) => {
		if(error) {
			callback({
				code: 500,
				message: 'Error adding withdraw increment'
			}, null);
		} else {
			callback(null, {});
		}
	});
}

module.exports = {
	updateWithdrawStatus,
	getWithdrawTransactions,
	getWithdrawTransactionsStatistics,
	getTotalWithdrawn,
	addWithdrawIncrement
}