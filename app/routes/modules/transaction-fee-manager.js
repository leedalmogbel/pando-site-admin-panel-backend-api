const mongoose = require('mongoose');
const TransactionFee = mongoose.model('TransactionFee');

const { saveLog } = require('./update-logs-manager');

const UpdateLogs = mongoose.model("UpdateLogs");
const Settings = mongoose.model("Settings");

const getTransactionFees = (callback) => {
	TransactionFee.find({})
		.sort({ range_lower: 1 })
		.exec((error, result) => {
			if(error) {
				callback({
					code: 500,
					message: 'Error fetching transaction fees'
				}, null);
			} else {
				callback(null, result);
			}
		});
}

const addTransactionFee = (req, emailId,callback) => {
	const { range_lower, range_upper, fee } = req.body;

	Settings.findOne({}, (error, settings) => {
		if(error) {
			callback({
				code: 500,
				message: 'Error saving transaction fee bracket'
			}, null);
		} else {
			if(settings.min_withdrawal_amount){
				if(fee < settings.min_withdrawal_amount){
					validateRange(range_lower, range_upper, '', settings.min_withdrawal_amount, (error, result) => {
						if(error) {
							callback(error, null);
						} else {
							const bracket = new TransactionFee({
								range_lower, range_upper, fee
							});
							bracket.save((error, result) => {
								if(error) {
									callback({
										code: 500,
										message: 'Error saving transaction fee bracket'
									}, null);
								} else {
									const updateLog = new UpdateLogs({
										log_model: 'settings',
										log_model_field: 'transaction_fee',
										log_details: JSON.stringify({ action: 'add', details: { range_lower, range_upper, fee } }),
										created_by: emailId
									});
									saveLog(updateLog);

									callback(null, result);
								}
							});
						}
					});
				} else {
					callback({
						code: 400,
						message: 'Fee cannot be greater or equal to minimum withdrawable amount'
					}, null);
				}
			} else {
				callback({
					code: 400,
					message: 'Configure minimum withrawable amount first'
				}, null);
			}
		}
	});
}

const editTransactionFee = (req, emailId,callback) => {
	const { bracketId } = req.params;
	const { range_lower, range_upper, fee } = req.body;

	Settings.findOne({}, (error, settings) => {
		if(error) {
			callback({
				code: 500,
				message: 'Error saving transaction fee bracket'
			}, null);
		} else {
			if(settings.min_withdrawal_amount){
				if(fee < settings.min_withdrawal_amount){
					validateRange(range_lower, range_upper, bracketId, settings.min_withdrawal_amount, (error, result) => {
						if(error) {
							callback(error, null);
						} else {
							TransactionFee.findById(bracketId, (error, bracket) => {
								if(error) {
									callback({
										code: 500,
										message: 'Error updating transaction fee bracket'
									}, null);
								} else {
									if(bracket) {
										const prevBracket = {
											range_lower: bracket.range_lower,
											range_upper: bracket.range_upper,
											fee: bracket.fee
										};
										
										bracket.range_lower = range_lower;
										bracket.range_upper = range_upper;
										bracket.fee = fee;

										bracket.save((error, result) => {
											if(error) {
												callback({
													code: 500,
													message: 'Error updating transaction fee bracket'
												}, null);
											} else {
												const updateLog = new UpdateLogs({
													log_model: 'settings',
													log_model_field: 'transaction_fee',
													log_details: JSON.stringify({ action: 'edit', before: prevBracket, after: { range_lower, range_upper, fee } }),
													created_by: emailId
												});
												saveLog(updateLog);

												callback(null, result);
											}
										});
									} else {
										callback({
											code: 404,
											message: 'Transaction fee bracket not found'
										}, null);
									}
								}
							});
						}
					});
				} else {
					callback({
						code: 400,
						message: 'Fee cannot be greater or equal to minimum withdrawable amount'
					}, null);
				}
			} else {
				callback({
					code: 400,
					message: 'Configure minimum withrawable amount first'
				}, null);
			}
		}
	});
}

const deleteTransactionFee = (bracketId, emailId, callback) => {
	TransactionFee.findByIdAndDelete(bracketId, (error, result) => {
		if(error) {
			callback({
				code: 500,
				message: 'Error deleting transaction fee bracket'
			}, null);
		} else {
			if(result) {
				const updateLog = new UpdateLogs({
					log_model: 'settings',
					log_model_field: 'transaction_fee',
					log_details: JSON.stringify({ action: 'delete', details: result }),
					created_by: emailId
				});
				saveLog(updateLog);

				callback(null, result);
			} else {
				callback({
					code: 404,
					message: 'Transaction fee bracket not found'
				}, null);
			}
		}
	});
}

const validateRange = (range_lower, range_upper, bracketId, min_withdrawal_amount, callback) => {
	getTransactionBracketByAmount(range_lower, (error, result) => {
		if(error) {
			callback(error, null);
		} else {
			if(result && result._id != bracketId) {
				callback({
					code: 400,
					message: 'Invalid start range value'
				}, null);
			} else {
				validateStartRange(range_lower, bracketId, min_withdrawal_amount, (error, validationResult) => {
					if(error) {
						callback(error, null);
					} else {
						const isValidStartRange = validationResult.isValidStartRange;
						if(isValidStartRange) {
							getTransactionBracketByAmount(range_upper, (error, result) => {
								if(error) {
									callback(error, null);
								} else {
									if(result && result._id != bracketId) {
										callback({
											code: 400,
											message: 'Invalid end range value'
										}, null);
									} else {
										validateEndRange(range_upper, bracketId, (error, validationResult) => {
											if(error) {
												callback(error, null);
											} else {
												if(validationResult.isValidEndRange) {
													callback(null, true);
												} else {
													callback({
														code: 400,
														message: `There is a window between bracket ${range_lower}-${range_upper} and bracket ${validationResult.range}. Please adjust accordingly`
													}, null);
												}
											}
										});
									}
								}
							});
						} else {
							callback({
								code: 400,
								message: `There is a window between bracket ${validationResult.range} and bracket ${range_lower}-${range_upper}. Please adjust accordingly`
							}, null);
						}
					}
				});
			}
		}
	});
}

const validateEndRange = (endRange, bracketId, callback) => {
	TransactionFee.countDocuments({}, (error, count) => {
		if(error) {
			callback({
				code: 500,
				message: 'Error validating transaction fee bracket'
			}, null);
		} else {
			if(count) {
				TransactionFee.findOne({ range_lower: { $gt: endRange } })
					.sort({ range_lower: 1 })
					.exec((error, nextBracket) => {
						if(nextBracket) {
							const diff = parseFloat((nextBracket.range_lower - endRange).toFixed(8));

							if(diff == 0.00000001) {
								callback(null, {
									isValidEndRange: true,
									range: ''
								});
							} else {
								callback(null, {
									isValidEndRange: false,
									range: `${nextBracket.range_lower}-${nextBracket.range_upper}`
								});
							}
						} else {
							callback(null, {
								isValidEndRange: true,
								range: ''
							});
						}
					});
			} else {
				callback(null, {
					isValidEndRange: true,
					range: ''
				});
			}
		}
	});
}

const validateStartRange = (startRange, bracketId, min_withdrawal_amount, callback) => {
	TransactionFee.countDocuments({}, (error, count) => {
		if(error) {
			callback({
				code: 500,
				message: 'Error validating transaction fee bracket'
			}, null);
		} else {
			if(count) {
				getFirstTransactionBracket((error, firstBracket) => {
					if(error) {
						callback(error, null);
					} else {
						if(bracketId) { // update
							if(firstBracket) {
								if(bracketId == firstBracket._id) {
									if(startRange != min_withdrawal_amount) {
										callback({
											code: 400,
											message: 'Invalid start range value, should be equal to minimum withdrawable amount'
										}, null);
										return;
									}
									if(count >= 1) {
										callback(null, {
											isValidStartRange: true,
											range: ''
										});
										return;
									}
								}
							}
						}

						if(startRange < firstBracket.range_lower) { // add new bracket lower than current first bracket
							if(startRange != min_withdrawal_amount){
								callback({
									code: 400,
									message: 'Invalid start range value, should be equal to minimum withdrawable amount'
								}, null);
								return;
							} else {
								callback(null, {
									isValidStartRange: true,
									range: ''
								});
								return;
							}
						}

						const expectedPrevEndRange = parseFloat((parseFloat(startRange) - 0.00000001).toFixed(8));
						TransactionFee.findOne({ range_upper: expectedPrevEndRange }, (error, result) => {
							if(error) {
								callback({
									code: 500,
									message: 'Error validating transaction fee bracket'
								}, null);
							} else {
								if(result) {
									callback(null, {
										isValidStartRange: true,
										range: ''
									});
								} else {
									TransactionFee.findOne({ range_upper: { $lt: startRange } })
										.sort({ range_upper: -1 })
										.exec((error, latestBracket) => {
											if(latestBracket) {
												callback(null, {
													isValidStartRange: false,
													range: `${latestBracket.range_lower}-${latestBracket.range_upper}`
												});
											} else {
												callback(null, {
													isValidStartRange: false,
													range: ''
												});
											}
										});
								}
							}
						});
					}
				});
			} else {
				if(startRange == min_withdrawal_amount) {
					callback(null, {
						isValidStartRange: true,
						range: ''
					});
				} else {
					callback({
						code: 400,
						message: 'Invalid start range value, should be equal to minimum withdrawable amount'
					}, null);
				}
			}
		}
	});
}

const getFirstTransactionBracket = (callback) => {
	TransactionFee.findOne({})
		.sort({ range_lower: 1 })
		.exec((error, firstBracket) => {
			if(error) {
				callback({
					code: 500,
					message: 'Error validating transaction fee bracket'
				}, null);
			} else {
				callback(null, firstBracket);
			}
		});
}

const getTransactionBracketByAmount = (amount, callback) => {
	TransactionFee.findOne({ range_lower: { $lte: amount }, range_upper: { $gte: amount } }, (error, result) => {
		if(error) {
			callback({
				code: 500,
				message: 'Error fetching transaction fee bracket with specified amount'
			}, null);	
		} else {
			callback(null, result);
		}
	});
}

const getHighestTransactionFeeAmount = () => {
	return new Promise((resolve, reject) => {
		TransactionFee.findOne({}).sort({ fee: -1 })
			.then(result => {
				if(result){
					resolve(result.fee);
				} else {
					resolve(0);
				}
			})
			.catch(error => {
				reject(error);
			});
	});
}

module.exports = {
	addTransactionFee,
	editTransactionFee,
	deleteTransactionFee,
	getTransactionFees,
	getHighestTransactionFeeAmount
}