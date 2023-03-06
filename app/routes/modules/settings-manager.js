const mongoose = require("mongoose");
const Settings = mongoose.model("Settings");
const errors = require("restify-errors");

const { saveLog } = require('./update-logs-manager');
const { withdrawalSettingsFields } = require('../../common/constants');
const { getHighestTransactionFeeAmount } = require('./transaction-fee-manager');
const Utils = require('../../common/Utils');

const UpdateLogs = mongoose.model("UpdateLogs");

const axios = require('axios');
const config = require("../../../config/config");

const validateFields = (fields, body, currentSettings, callback) => {
	let hasError = false;
	let errorMessage = '';
	let hasMaxWithdrawField = false;

	fields.sort((a, b) => {
		if(a > b) {
			return -1;
		}
		if(a < b) {
			return 1;
		}
		return 0;
	});

	const validateFields = fields.map(async (field) => {
		if(field == 'max_withdrawal_amount') {
			if(!parseFloat(body[field])) {
				hasError = true;
				errorMessage = 'Maximum withdrawal amount should be greater than zero or to the minimum withdrawal amount';
			}
			hasMaxWithdrawField = true;
		}

		if(field == 'min_withdrawal_amount'){
			if(!parseFloat(body[field])) {
				hasError = true;
				errorMessage = 'Minimum withdrawal amount should be greater than the highest transaction fee configured';
			} else {
				await getHighestTransactionFeeAmount()
					.then(transactionFee => {
						if(transactionFee){
							if(parseFloat(body[field]) <= transactionFee){
								hasError = true;
								errorMessage = 'Minimum withdrawal amount should be greater than the highest transaction fee configured';
							}
						}
					})
					.catch(error => {
						hasError = true;
						errorMessage = 'Error fetching transaction fee for minimum withdrawal amount validation';
					});
			}
		}

		if(field == 'daily_withdraw_limit_amount') {
			if(hasMaxWithdrawField) {
				if(!parseFloat(body[field]) || parseFloat(body[field]) < parseFloat(body['max_withdrawal_amount'])) {
					hasError = true;
					errorMessage = 'Daily Withdrawal Amount Limit should be greater than or equal to the Maximum Withdrawal Amount per Transaction';
				}
			} else {
				if(!parseFloat(body[field]) || parseFloat(body[field]) < currentSettings.max_withdrawal_amount) {
					hasError = true;
					errorMessage = 'Daily Withdrawal Amount Limit should be greater than or equal to the Maximum Withdrawal Amount per Transaction';
				}
			}
		}

		if(field == 'daily_withdraw_limit_frequency') {
			if(!parseInt(body[field]) || parseInt(body[field]) <= 0) {
				hasError = true;
				errorMessage = 'Maximum Number of Transaction per Day should be greater than zero';
			}
		}

		if(field == 'no_plan_users_enable_withdraw') {
			if(typeof body[field] !== 'boolean') {
				hasError = true;
				errorMessage = 'Invalid value for withdrawal flag for no-plan users';
			}
		}

		if(field == 'enable_withdraw') {
			if(typeof body[field] !== 'boolean') {
				hasError = true;
				errorMessage = 'Invalid value for withdrawal flag for all users';
			}
		}
	});

	Promise.all(validateFields).then(() => {
		callback(null, hasError, errorMessage);
	});
}

const updateWithdrawalSettings = function(req, emailId, callback) {
	const settings = {};
	const logs = [];
	
	Settings.findOne({}, (error, currentSettings) => {
		if(error) {
			const err = new errors.InternalError({
				statusCode: 500
			}, "Error while updating the settings");
			callback(err, null);
		} else {
			if(req.body) {
				const fields = Object.keys(req.body);

				validateFields(fields, req.body, currentSettings, (error, hasError, errorMessage) => {
					if(hasError) {
						const err = new errors.InternalError({
							statusCode: 400
						}, errorMessage);
						callback(err, null);
					} else {
						if(fields.length) {
							fields.forEach(field => {
								if(req.body[field] != currentSettings[field]) { // new value
									settings[field] = req.body[field];
									const updateLog = new UpdateLogs({
										log_model: 'settings',
										log_model_field: field,
										log_details: JSON.stringify({ action: 'edit', before: currentSettings[field] || 0, after: req.body[field] }),
										created_by: emailId
									});
									logs.push(updateLog);
								}
							});

							if(Object.keys(settings).length){
								Settings.updateOne({}, settings)
									.then(result => {
										logs.forEach(log => {
											saveLog(log);
										});

										callback(null, result);
									})
									.catch(error => {
										const err = new errors.InternalError({
											statusCode: 500
										}, "Error while updating the settings");
										callback(err, null);
									});
							} else {
								callback(null, true);
							}
						} else {
							const err = new errors.InternalError({
								statusCode: 400
							}, "No request body");
							callback(err, null);
						}
					}
				});
			} else {
				const err = new errors.InternalError({
					statusCode: 400
				}, "No request body");
				callback(err, null);
			}
		}
	});
}

const updateSettings = function(req, emailId, callback) {
	const settings = {};
	const logs = [];
	
	Settings.findOne({}, (error, currentSettings) => {
		if(error) {
			const err = new errors.InternalError({
				statusCode: 500
			}, "Error while updating the settings");
			callback(err, null);
		} else {
			if(req.body) {
				const fields = Object.keys(req.body);

				if(fields.length) {
					let hasForbiddenFields = false;

					fields.forEach(field => {
						if(withdrawalSettingsFields.includes(field)){
							hasForbiddenFields = true;
						} else {
							if(req.body[field] != currentSettings[field]) { // new value
								settings[field] = req.body[field];
								const updateLog = new UpdateLogs({
									log_model: 'settings',
									log_model_field: field,
									log_details: JSON.stringify({ action: 'edit', before: currentSettings[field], after: req.body[field] }),
									created_by: emailId
								});
								logs.push(updateLog);
							}
						}
					});

					if(hasForbiddenFields){
						const err = new errors.UnauthorizedError({
							statusCode: 401
						}, "User has no rights to update the fields specified in the request body");
						callback(err, null);
					} else {
						if(Object.keys(settings).length){
							Settings.updateOne({}, settings)
								.then(result => {
									logs.forEach(log => {
										saveLog(log);
									});

									callback(null, result);
								})
								.catch(error => {
									const err = new errors.InternalError({
										statusCode: 500
									}, "Error while updating the settings");
									callback(err, null);
								});
						} else {
							callback(null, true);
						}
					}
				} else {
					const err = new errors.InternalError({
						statusCode: 400
					}, "No request body");
					callback(err, null);
				}
			} else {
				const err = new errors.InternalError({
					statusCode: 400
				}, "No request body");
				callback(err, null);
			}
		}
	});
}

const getWithdrawalSettings = function(req, callback) {
	Settings.findOne({})
		.then(result => {
			callback(null, {
				min_withdrawal_amount: result.min_withdrawal_amount,
				max_withdrawal_amount: result.max_withdrawal_amount,
				withdrawal_speed: result.withdrawal_speed,
				eth_balance_threshold: result.eth_balance_threshold,
				pando_balance_threshold: result.pando_balance_threshold,
				daily_withdraw_limit_amount: result.daily_withdraw_limit_amount,
				daily_withdraw_limit_frequency: result.daily_withdraw_limit_frequency,
				no_plan_users_enable_withdraw: result.no_plan_users_enable_withdraw,
				enable_withdraw: result.enable_withdraw
			});
		})
		.catch(error => {
			const err = new errors.InternalError({
				statusCode: 500
			}, "Error while fetching the settings");
			callback(err, null);
		});
}

const getSettings = function(req, callback) {
	Settings.findOne({})
		.then(result => {
			const tmp = result.toJSON();
			callback(null, {
				commission_rate: result.commission_rate,
				referral_rate: result.referral_rate,
				commission_rate_dec: tmp.commission_rate_dec,
				referral_rate_dec: tmp.referral_rate_dec
			});
		})
		.catch(error => {
			const err = new errors.InternalError({
				statusCode: 500
			}, "Error while fetching the settings");
			callback(err, null);
		});
}

const getHotWalletAddresses = function(field, callback) {
	Settings.findOne({}, (error, settings) => {
		if(error) {
			const err = new errors.InternalError({
				statusCode: 500
			}, "Error fetching hot wallet addresses");
			callback(err, null);
		} else {
			const hotWalletAddresses = settings[field];
			const results = [];
			let hasError = false;
			
			hotWalletAddresses.forEach(async (address) => {
				let eth_balance = 0;
				let pando_balance = 0;

				await axios.get(`${config.cryptoApiUrl}/balance/${address}`)
					.then(cResult => {
						if(cResult.data.code === 200){
							eth_balance = cResult.data.data.ethBalance;
							pando_balance = cResult.data.data.tokenBalance;
						} else {
							hasError = true;
						}
					})
					.catch(error => {
						console.log(error);
						hasError = true;
					});

				const eth_balance_below_threshold = eth_balance < settings.eth_balance_threshold ? true : false;
				const pando_balance_below_threshold = pando_balance < settings.pando_balance_threshold ? true : false;

				results.push({
					address,
					eth_balance,
					pando_balance,
					eth_balance_below_threshold,
					pando_balance_below_threshold
				});
			});

			if(hasError){
				const err = new errors.InternalError({
					statusCode: 500
				}, "Error fetching hot wallet addresses");
				callback(err, null);
			} else {
				callback(null, results);
			}
		}
	});
}

const addHotWalletAddress = function(field, address, privateKey, emailId, callback) {
	Settings.findOne({}, (error, settings) => {
		if(error) {
			const err = new errors.InternalError({
				statusCode: 500
			}, "Error adding hot wallet address");
			callback(err, null);
		} else {
			const hotWalletAddresses = settings[field];
			if(!hotWalletAddresses.includes(address)){
				hotWalletAddresses.push(address);
				settings[field] = hotWalletAddresses;

				if(secret.password && secret.salt){
					const cryptoBody = { address, privateKey };
					const payload = Utils.encryptString(secret.password, secret.salt, JSON.stringify(cryptoBody)).hex;

					axios.post(`${config.cryptoApiUrl}/wallet`, { payload })
						.then(cResult => {
							if(cResult.data.code === 200){
								settings.save((error, result) => {
									if(error) {
										const err = new errors.InternalError({
											statusCode: 500
										}, "Error adding hot wallet address");
										callback(err, null);
									} else {
										const updateLog = new UpdateLogs({
											log_model: 'settings',
											log_model_field: field,
											log_details: JSON.stringify({ action: 'add', details: address }),
											created_by: emailId
										});
										saveLog(updateLog);

										callback(null, result);
									}
								});
							} else {
								const err = new errors.InternalError({
									statusCode: cResult.data.code
								}, cResult.data.data.message);
								callback(err, null);
							}
						})
						.catch(error => {
							console.log(error);
							const err = new errors.InternalError({
								statusCode: 500
							}, "Error adding hot wallet address");
							callback(err, null);
						});
				} else {
					const err = new errors.InternalError({
						statusCode: 500
					}, "Error adding hot wallet address (key-pair missing, contact developer to generate new key-pair)");
					callback(err, null);
				}
			} else {
				const err = new errors.InternalError({
					statusCode: 400
				}, "Wallet address already exists");
				callback(err, null);
			}
		}
	});
}

const deleteHotWalletAddress = function(field, address, emailId, callback) {
	Settings.findOne({}, (error, settings) => {
		if(error) {
			const err = new errors.InternalError({
				statusCode: 500
			}, "Error deleting hot wallet address");
			callback(err, null);
		} else {
			const hotWalletAddresses = settings[field];
			if(hotWalletAddresses.includes(address)){

				settings[field] = hotWalletAddresses.filter((value) => { return value != address });

				if(secret.password && secret.salt){
					const cryptoBody = { address };
					const payload = Utils.encryptString(secret.password, secret.salt, JSON.stringify(cryptoBody)).hex;

					axios.delete(`${config.cryptoApiUrl}/wallet`, { payload })
						.then(cResult => {
							if(cResult.data.code === 200){
								settings.save((error, result) => {
									if(error) {
										const err = new errors.InternalError({
											statusCode: 500
										}, "Error deleting hot wallet address");
										callback(err, null);
									} else {
										const updateLog = new UpdateLogs({
											log_model: 'settings',
											log_model_field: field,
											log_details: JSON.stringify({ action: 'delete', details: address }),
											created_by: emailId
										});
										saveLog(updateLog);

										callback(null, result);
									}
								});
							} else {
								const err = new errors.InternalError({
									statusCode: cResult.data.code
								}, cResult.data.data.message);
								callback(err, null);
							}
						})
						.catch(error => {
							console.log(error);
							const err = new errors.InternalError({
								statusCode: 500
							}, "Error deleting hot wallet address");
							callback(err, null);
						});
				} else {
					const err = new errors.InternalError({
						statusCode: 500
					}, "Error deleting hot wallet address (key-pair missing, contact developer to generate new key-pair)");
					callback(err, null);
				}
			} else {
				const err = new errors.InternalError({
					statusCode: 404
				}, "Wallet address does not exists");
				callback(err, null);
			}
		}
	});
}

const editHotWalletAddress = function(field, oldAddress, newAddress, privateKey, emailId, callback) {
	Settings.findOne({}, (error, settings) => {
		if(error) {
			const err = new errors.InternalError({
				statusCode: 500
			}, "Error updating hot wallet address");
			callback(err, null);
		} else {
			const hotWalletAddresses = settings[field];
			if(hotWalletAddresses.includes(oldAddress)){
				if(hotWalletAddresses.includes(newAddress)) {
					const err = new errors.InternalError({
						statusCode: 400
					}, "New wallet address already exists");
					callback(err, null);
				} else {
					const index = hotWalletAddresses.indexOf(oldAddress);
					hotWalletAddresses[index] = newAddress;

					settings[field] = hotWalletAddresses;

					Settings.updateOne({}, settings, (error, result) => {
						if(error) {
							const err = new errors.InternalError({
								statusCode: 500
							}, "Error updating hot wallet address");
							callback(err, null);
						} else {
							const updateLog = new UpdateLogs({
								log_model: 'settings',
								log_model_field: field,
								log_details: JSON.stringify({ action: 'edit', before: oldAddress, after: newAddress }),
								created_by: emailId
							});
							saveLog(updateLog);

							callback(null, settings);
						}
					});
				}
			} else {
				const err = new errors.InternalError({
					statusCode: 404
				}, "Wallet address does not exists");
				callback(err, null);
			}
		}
	});
}

const getGasValue = (callback) => {
	Settings.findOne({}, (error, settings) => {
		if(error){
			console.log(error);
			callback({
				code: 500,
				message: 'Error fetching gas value'
			}, null);
		} else {
			callback(null, settings.withdrawal_speed);
		}
	});
}

const getBalanceThreshold = (callback) => {
	Settings.findOne({}, (error, settings) => {
		if(error){
			console.log(error);
			callback({
				code: 500,
				message: 'Error fetching threshold values'
			}, null);
		} else {
			callback(null, {
				eth_threshold: settings.eth_balance_threshold,
				pando_threshold: settings.pando_balance_threshold
			});
		}
	});
}

module.exports = {
	updateSettings,
	getSettings,
	updateWithdrawalSettings,
	getWithdrawalSettings,
	addHotWalletAddress,
	deleteHotWalletAddress,
	editHotWalletAddress,
	getHotWalletAddresses,
	getGasValue,
	getBalanceThreshold
}