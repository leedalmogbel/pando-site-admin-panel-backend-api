const axios = require('axios');
const config = require("../../../config/config");
const Utils = require('../../common/Utils');

const errors = require("restify-errors");

const mongoose = require("mongoose");
const UpdateLogs = mongoose.model("UpdateLogs");
const Settings = mongoose.model("Settings");
const { saveLog } = require('./update-logs-manager');

const getHotWalletAddresses = (callback) => {
	Settings.findOne({}, (error, settings) => {
		if(error) {
			const err = new errors.InternalError({
				statusCode: 500
			}, "Error fetching hot wallet addresses");
			callback(err, null);
		} else {
			axios.get(`${config.cryptoApiUrl}/wallets`)
				.then(ccResult => {
					if(ccResult.data.code === 200){
						const hotWalletAddresses = ccResult.data.data;
						const results = [];
						let hasError = false;
						
						const getWalletBalance = hotWalletAddresses.map(async (hotWallet) => {
							const address = hotWallet.address;

							let eth_balance = 0;
							let pando_balance = 0;

							await axios.get(`${config.cryptoApiUrl}/balance/${address}`)
								.then(cResult => {
									if(cResult.data.code === 200){
										eth_balance = cResult.data.data.eth;
										pando_balance = cResult.data.data.pando;
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
								_id: hotWallet.index,
								address,
								active: hotWallet.active,
								eth_balance,
								pando_balance,
								eth_balance_below_threshold,
								pando_balance_below_threshold
							});
						});

						Promise.all(getWalletBalance).then(() => {
							if(hasError){
								const err = new errors.InternalError({
									statusCode: 500
								}, "Error fetching hot wallet addresses");
								callback(err, null);
							} else {
								results.sort((a, b) => {
									if(a.address < b.address){
										return -1;
									} else if(a.address > b.address){
										return 1;
									} else {
										return 0;
									}
								});
								callback(null, results);
							}
						});
					} else {
						console.log(ccResult.data);
						const err = new errors.InternalError({
							statusCode: 500
						}, "Error fetching hot wallet addresses");
						callback(err, null);
					}
				})
				.catch(error => {
					console.log(error);
					const err = new errors.InternalError({
						statusCode: 500
					}, "Error fetching hot wallet addresses");
					callback(err, null);
				});
		}
	});
}

const addHotWalletAddress = function(field, address, privateKey, emailId, callback) {
	if(secret.password && secret.salt){
		const cryptoBody = { address, privateKey };
		const payload = Utils.encryptString(secret.password, secret.salt, JSON.stringify(cryptoBody)).hex;

		axios.post(`${config.cryptoApiUrl}/wallet`, { payload })
			.then(cResult => {
				if(cResult.data.code === 200){
					const updateLog = new UpdateLogs({
						log_model: 'settings',
						log_model_field: field,
						log_details: JSON.stringify({ action: 'add', details: address }),
						created_by: emailId
					});
					saveLog(updateLog);

					callback(null, cResult);
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
		let envi = 1;  //re-generate key pair
		if(config.env == 'sat'){
			envi = 1;
		} else if(config.env == 'development'){ //uat
			envi = 2;
		} else if(config.env == 'production'){
			envi = 3;
		}

		Utils.generateAndSendKeyPair(envi, (error, result) => {});

		const err = new errors.InternalError({
			statusCode: 500
		}, "We detected that one of our server have undergone a reset procedure. Please try again after 10 seconds.");
		callback(err, null);
	}
}

const deleteHotWalletAddress = function(field, address, emailId, callback) {
	if(secret.password && secret.salt){
		const cryptoBody = { address };
		const payload = Utils.encryptString(secret.password, secret.salt, JSON.stringify(cryptoBody)).hex;

		axios.delete(`${config.cryptoApiUrl}/wallet`, { data: { payload } })
			.then(cResult => {
				if(cResult.data.code === 200){
					const updateLog = new UpdateLogs({
						log_model: 'settings',
						log_model_field: field,
						log_details: JSON.stringify({ action: 'delete', details: address }),
						created_by: emailId
					});
					saveLog(updateLog);

					callback(null, cResult);
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
		let envi = 1;  //re-generate key pair
		if(config.env == 'sat'){
			envi = 1;
		} else if(config.env == 'development'){ //uat
			envi = 2;
		} else if(config.env == 'production'){
			envi = 3;
		}

		Utils.generateAndSendKeyPair(envi, (error, result) => {});

		const err = new errors.InternalError({
			statusCode: 500
		}, "We detected that one of our server have undergone a reset procedure. Please try again after 10 seconds.");
		callback(err, null);
	}
}

const editHotWalletAddress = function(field, oldAddress, newAddress, privateKey, emailId, callback) {
	if(secret.password && secret.salt){
		const cryptoBody = { address: oldAddress };
		const payload = Utils.encryptString(secret.password, secret.salt, JSON.stringify(cryptoBody)).hex;

		axios.delete(`${config.cryptoApiUrl}/wallet`, { data: { payload } })
			.then(cResult => {
				if(cResult.data.code === 200){
					const addCryptoBody = { address: newAddress, privateKey };
					const addPayload = Utils.encryptString(secret.password, secret.salt, JSON.stringify(addCryptoBody)).hex;

					axios.post(`${config.cryptoApiUrl}/wallet`, { payload: addPayload })
						.then(ccResult => {
							if(ccResult.data.code === 200){
								let action = 'edit';
								if(oldAddress == newAddress) {
									action = 'reactivated';
								}
								const updateLog = new UpdateLogs({
									log_model: 'settings',
									log_model_field: field,
									log_details: JSON.stringify({ action, before: oldAddress, after: newAddress }),
									created_by: emailId
								});
								saveLog(updateLog);

								callback(null, ccResult);
							} else {
								const err = new errors.InternalError({
									statusCode: ccResult.data.code
								}, ccResult.data.data.message);
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
						statusCode: cResult.data.code
					}, cResult.data.data.message);
					callback(err, null);
				}
			})
			.catch(error => {
				console.log(error);
				const err = new errors.InternalError({
					statusCode: 500
				}, "Error updating hot wallet address");
				callback(err, null);
			});
	} else {
		let envi = 1;  //re-generate key pair
		if(config.env == 'sat'){
			envi = 1;
		} else if(config.env == 'development'){ //uat
			envi = 2;
		} else if(config.env == 'production'){
			envi = 3;
		}

		Utils.generateAndSendKeyPair(envi, (error, result) => {});
		
		const err = new errors.InternalError({
			statusCode: 500
		}, "We detected that one of our server have undergone a reset procedure. Please try again after 10 seconds.");
		callback(err, null);
	}
}

module.exports = {
	getHotWalletAddresses,
	addHotWalletAddress,
	deleteHotWalletAddress,
	editHotWalletAddress
}