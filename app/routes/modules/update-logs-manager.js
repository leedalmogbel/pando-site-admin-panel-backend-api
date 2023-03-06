const mongoose = require("mongoose");
const UpdateLogs = mongoose.model("UpdateLogs");

const { withdrawalSpeedSt } = require('../../common/constants');

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

const saveLog = function(log) {
	return new Promise((resolve, reject) => {
		log.save()
			.then(result => {
				resolve(result)
			})
			.catch(error => {
				reject(error);
			});
	});
}

const getLogs = function() {
	return new Promise((resolve, reject) => {
		UpdateLogs.find()
			.then(logs => {
				resolve(logs);
			})
			.catch(error => {
				reject(error);
			});
	});
}

const getLogsByModel = function(model) {
	return new Promise((resolve, reject) => {
		UpdateLogs.find({ log_model: model })
			.then(logs => {
				resolve(logs);
			})
			.catch(error => {
				reject(error);
			});
	});
}

const getHotWalletUpdateLogs = (callback) => {
	UpdateLogs.find({ 
		log_model: 'settings',
		'$or': [
			{ log_model_field: 'decenternet_hot_wallet_address' },
			{ log_model_field: 'pando_hot_wallet_address' },
			{ log_model_field: 'eth_balance_threshold' },
			{ log_model_field: 'pando_balance_threshold' }
		]
	}, (error, logs) => {
		if(error) {
			console.log(error);
			callback({
				code: 500,
				message: 'Error fetching logs'
			}, null);
		} else {
			const updatedLogs = [];
			logs.forEach(log => {
				const logDetails = JSON.parse(log.log_details);
				
				let action = '';
				let change_from = '';
				let change_to = '';

				if(log.log_model_field == 'pando_hot_wallet_address' 
					|| log.log_model_field == 'decenternet_hot_wallet_address') {
					if(logDetails.action === 'add'){
						action = 'Add New';
						change_from = 'N/A';
						change_to = logDetails.details;
					} else if(logDetails.action === 'edit'){
						action = 'Edit';
						change_from = logDetails.before;
						change_to = logDetails.after;
					} else if(logDetails.action === 'delete'){
						action = 'Delete';
						change_from = logDetails.details;
						change_to = 'Delete';
					} else if(logDetails.action === 'reactivated'){
						action = 'Reactivated',
						change_from = logDetails.before,
						change_to = 'N/A'
					}
				} else if(log.log_model_field == 'eth_balance_threshold'){
					action = 'Edit Threshold';
					change_from = `${logDetails.before} ETH`;
					change_to = `${logDetails.after} ETH`;
				} else if(log.log_model_field == 'pando_balance_threshold'){
					action = 'Edit Threshold';
					change_from = `${logDetails.before} PANDO`;
					change_to = `${logDetails.after} PANDO`;
				}

				updatedLogs.push({
					_id: log._id,
					createdAt: log.createdAt,
					field: log.log_model_field,
					action,
					change_from,
					change_to
				});
			});

			// sort desc
			updatedLogs.sort((a, b) => {
				if(a.createdAt < b.createdAt){
					return 1;
				} else if(a.createdAt > b.createdAt){
					return -1;
				} else {
					return 0;
				}
			});

			callback(null, updatedLogs);
		}
	});
}

const getWithdrawalSettingsUpdateLogs = (callback) => {
	UpdateLogs.find({ 
		log_model: 'settings',
		'$or': [
			{ log_model_field: 'min_withdrawal_amount' },
			{ log_model_field: 'max_withdrawal_amount' },
			{ log_model_field: 'withdrawal_speed' },
			{ log_model_field: 'daily_withdraw_limit_amount' },
			{ log_model_field: 'daily_withdraw_limit_frequency' },
			{ log_model_field: 'no_plan_users_enable_withdraw' },
			{ log_model_field: 'enable_withdraw' }
		]
	}, (error, logs) => {
		if(error) {
			console.log(error);
			callback({
				code: 500,
				message: 'Error fetching logs'
			}, null);
		} else {
			const updatedLogs = [];
			logs.forEach(log => {
				const logDetails = JSON.parse(log.log_details);

				let changeFrom = log.log_model_field == 'withdrawal_speed' ? withdrawalSpeedSt[logDetails.before] : logDetails.before;
				let changeTo = log.log_model_field == 'withdrawal_speed' ? withdrawalSpeedSt[logDetails.after] : logDetails.after;

				if(log.log_model_field == 'enable_withdraw' || log.log_model_field == 'no_plan_users_enable_withdraw') {
					changeFrom = logDetails.before ? 'On' : 'Off';
					changeTo = logDetails.after ? 'On' : 'Off';
				}

				updatedLogs.push({
					_id: log._id,
					createdAt: log.createdAt,
					field: log.log_model_field,
					action: logDetails.action.toProperCase(),
					change_from: changeFrom,
					change_to: changeTo
				});
			});

			// sort desc
			updatedLogs.sort((a, b) => {
				if(a.createdAt < b.createdAt){
					return 1;
				} else if(a.createdAt > b.createdAt){
					return -1;
				} else {
					return 0;
				}
			});

			callback(null, updatedLogs);
		}
	});
}

const getTransactionFeeUpdateLogs = (callback) => {
	UpdateLogs.find({ 
		log_model: 'settings',
		log_model_field: 'transaction_fee'
	}, (error, logs) => {
		if(error) {
			console.log(error);
			callback({
				code: 500,
				message: 'Error fetching logs'
			}, null);
		} else {
			const updatedLogs = [];
			logs.forEach(log => {
				const logDetails = JSON.parse(log.log_details);

				let action = '';
				let change_range_from = '';
				let change_range_to = '';
				let change_fee_from = '';
				let change_fee_to = '';

				if(logDetails.action === 'add'){
					action = 'Add New';
					change_range_from = 'N/A';
					change_range_to = `${logDetails.details.range_lower}-${logDetails.details.range_upper}`;
					change_fee_from = 'N/A';
					change_fee_to = `${logDetails.details.fee} PANDO`;
				} else if(logDetails.action === 'edit'){
					action = 'Edit';
					change_range_from = `${logDetails.before.range_lower}-${logDetails.before.range_upper}`;
					change_range_to = `${logDetails.after.range_lower}-${logDetails.after.range_upper}`;
					change_fee_from = `${logDetails.before.fee} PANDO`;
					change_fee_to = `${logDetails.after.fee} PANDO`;
				} else if(logDetails.action === 'delete'){
					action = 'Delete';
					change_range_to = 'Delete';
					change_range_from = `${logDetails.details.range_lower}-${logDetails.details.range_upper}`;
					change_fee_to = 'Delete';
					change_fee_from = `${logDetails.details.fee} PANDO`;
				}

				updatedLogs.push({
					_id: log._id,
					createdAt: log.createdAt,
					field: log.log_model_field,
					action,
					change_range_from,
					change_range_to,
					change_fee_from,
					change_fee_to
				});
			});

			// sort desc
			updatedLogs.sort((a, b) => {
				if(a.createdAt < b.createdAt){
					return 1;
				} else if(a.createdAt > b.createdAt){
					return -1;
				} else {
					return 0;
				}
			});

			callback(null, updatedLogs);
		}
	});
}

module.exports = {
	saveLog,
	getLogs,
	getLogsByModel,
	getHotWalletUpdateLogs,
	getWithdrawalSettingsUpdateLogs,
	getTransactionFeeUpdateLogs
}