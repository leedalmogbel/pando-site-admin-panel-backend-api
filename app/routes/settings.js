const { isAdminUser } = require('./modules/admin-user-manager');

const {
	updateSettings,
	getSettings,
	updateWithdrawalSettings,
	getWithdrawalSettings,
	getGasValue,
	getBalanceThreshold
} = require("./modules/settings-manager");

const {
	addHotWalletAddress,
	deleteHotWalletAddress,
	getHotWalletAddresses,
	editHotWalletAddress
} = require('./modules/hot-wallet-manager');

const {
	addTransactionFee,
	editTransactionFee,
	deleteTransactionFee,
	getTransactionFees
} = require('./modules/transaction-fee-manager');

const fs = require('fs');
const axios = require('axios');
const { wallet_fields, userRoles } = require('../common/constants');
const Utils = require('../common/Utils');
const config = require("../../config/config");

const mongoose = require("mongoose");
const Settings = mongoose.model("Settings");

const API_BASE_PATH = "/settings";
const API_VERSION = "1.0.0";

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
	host: config.email.host,
	port: config.email.port,
	secure: config.email.secure,
	auth: {
		user: config.email.auth.user,
		pass: config.email.auth.pass
	}
});

module.exports = function(server) {
	server.get({
		path: API_BASE_PATH,
		version: API_VERSION
	}, _getSettings);

	server.put({
		path: API_BASE_PATH,
		version: API_VERSION
	}, _updateSettings);

	server.post({
		path: API_BASE_PATH + '/secret',
		version: API_VERSION
	}, setSecret);

	server.post({
		path: API_BASE_PATH + '/generate-key-pair/:envi',
		version: API_VERSION
	}, generateKeyPair);

	server.get({
		path: API_BASE_PATH + '/gas-value',
		version: API_VERSION
	}, _getGasValue);

	server.get({
		path: API_BASE_PATH + '/threshold',
		version: API_VERSION
	}, _getBalanceThreshold);

	server.post({
		path: API_BASE_PATH + '/send-restart-notif',
		version: API_VERSION
	}, sendRestartNotif);

	server.post({
		path: API_BASE_PATH + '/send-balance-notif/:wallet_address',
		version: API_VERSION
	}, sendBalanceNotif);

	server.get({
		path: API_BASE_PATH + '/withdrawal-settings',
		version: API_VERSION
	}, _getWithdrawalSettings);

	server.put({
		path: API_BASE_PATH + '/withdrawal-settings',
		version: API_VERSION
	}, _updateWithdrawalSettings);

	server.get({
		path: API_BASE_PATH + '/transaction_fee',
		version: API_VERSION
	}, _getTransactionFees);

	server.post({
		path: API_BASE_PATH + '/transaction_fee',
		version: API_VERSION
	}, addTransactionFeeBracket);

	server.put({
		path: API_BASE_PATH + '/transaction_fee/:bracketId',
		version: API_VERSION
	}, editTransactionFeeBracket);
	
	server.del({
		path: API_BASE_PATH + '/transaction_fee/:bracketId',
		version: API_VERSION
	}, deleteTransactionFeeBracket);

	server.get({
		path: API_BASE_PATH + '/:wallet_field',
		version: API_VERSION
	}, _getWalletAddress);

	server.post({
		path: API_BASE_PATH + '/:wallet_field',
		version: API_VERSION
	}, _addWalletAddress);

	server.put({
		path: API_BASE_PATH + '/:wallet_field/:old_wallet_address',
		version: API_VERSION
	}, _editWalletAddress);

	server.del({
		path: API_BASE_PATH + '/:wallet_field/:wallet_address',
		version: API_VERSION
	}, _deleteWalletAddress);

	function setSecret(req, res, next) {
		const { password, salt } = req.body;
		secret.password = password;
		secret.salt = salt;
		res.send({ message: "Ok" });
		return next();
	}

	function generateKeyPair(req, res, next) {
		Utils.generateAndSendKeyPair(parseInt(req.params.envi), (error, result) => {
			console.log(error, result);
			res.send({ message: "Ok " });
			return next();
		});
	}

	function _getTransactionFees(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				if(data.role == userRoles.SUPER_ADMIN && data.email_id == config.superAdminEmailAddress){
					getTransactionFees((error, result) => {
						if(error) {
							res.send(error.code, { error: error.message });
							return next();
						} else {
							res.send(result);
							return next();
						}
					});
				} else {
					res.send(401, { error: "Unauthorized Access" });
					return next();
				}
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function addTransactionFeeBracket(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				if(data.role == userRoles.SUPER_ADMIN && data.email_id == config.superAdminEmailAddress){
					addTransactionFee(req, data.email_id, (error, result) => {
						if(error) {
							res.send(error.code, { error: error.message });
							return next();
						} else {
							res.send(result);
							return next();
						}
					});
				} else {
					res.send(401, { error: "Unauthorized Access" });
					return next();
				}
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function editTransactionFeeBracket(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				if(data.role == userRoles.SUPER_ADMIN && data.email_id == config.superAdminEmailAddress){
					editTransactionFee(req, data.email_id, (error, result) => {
						if(error) {
							res.send(error.code, { error: error.message });
							return next();
						} else {
							res.send(result);
							return next();
						}
					});
				} else {
					res.send(401, { error: "Unauthorized Access" });
					return next();
				}
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function deleteTransactionFeeBracket(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				if(data.role == userRoles.SUPER_ADMIN && data.email_id == config.superAdminEmailAddress){
					const { bracketId } = req.params;
					deleteTransactionFee(bracketId, data.email_id, (error, result) => {
						if(error) {
							res.send(error.code, { error: error.message });
							return next();
						} else {
							res.send(result);
							return next();
						}
					});
				} else {
					res.send(401, { error: "Unauthorized Access" });
					return next();
				}
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _getWalletAddress(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				if(data.role == userRoles.SUPER_ADMIN && data.email_id == config.superAdminEmailAddress){
					const wallet_field = req.params.wallet_field;

					if(wallet_field && wallet_fields.includes(wallet_field)){
						getHotWalletAddresses((error, result) => {
							if(error) {
								res.send(error.statusCode, { error: error.body.message });
								return next();
							} else {
								res.send(result);
								return next();
							}
						});
					} else {
						res.send(400, { error: 'Invalid wallet_field'});
						return next();
					}
				} else {
					res.send(401, { error: "Unauthorized Access" });
					return next();
				}
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _addWalletAddress(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				if(data.role == userRoles.SUPER_ADMIN && data.email_id == config.superAdminEmailAddress){
					const wallet_field = req.params.wallet_field;

					if(wallet_field && wallet_fields.includes(wallet_field)){
						const { wallet_address, private_key } = req.body;
						if(wallet_address && private_key) {
							addHotWalletAddress(wallet_field, wallet_address, private_key, data.email_id, (error, result) => {
								if(error) {
									res.send(error.statusCode, { error: error.body.message });
									return next();
								} else {
									res.send({ messsage: 'Wallet address added successfully' });
									return next();
								}
							});
						} else {
							res.send(412, { error: 'Missing field in the request body (expected: wallet_address and private_key)' });
							return next();
						}
					} else {
						res.send(400, { error: 'Invalid wallet_field'});
						return next();
					}
				} else {
					res.send(401, { error: "Unauthorized Access" });
					return next();
				}
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _deleteWalletAddress(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				if(data.role == userRoles.SUPER_ADMIN && data.email_id == config.superAdminEmailAddress){
					const { wallet_field, wallet_address } = req.params;

					if(wallet_field && wallet_fields.includes(wallet_field)){
						if(wallet_address) {
							deleteHotWalletAddress(wallet_field, wallet_address, data.email_id, (error, result) => {
								if(error) {
									res.send(error.statusCode, { error: error.body.message });
									return next();
								} else {
									res.send({ messsage: 'Wallet address deleted successfully' });
									return next();
								}
							});
						} else {
							res.send(412, { error: 'Missing field in the request URL params (expected: wallet_address)' });
							return next();
						}
					} else {
						res.send(400, { error: 'Invalid wallet_field'});
						return next();
					}
				} else {
					res.send(401, { error: "Unauthorized Access" });
					return next();
				}
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _editWalletAddress(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				if(data.role == userRoles.SUPER_ADMIN && data.email_id == config.superAdminEmailAddress){
					const { wallet_field, old_wallet_address } = req.params;

					if(wallet_field && wallet_fields.includes(wallet_field)){
						if(old_wallet_address) {
							const { new_wallet_address, private_key } = req.body;

							if(new_wallet_address && private_key) {
								editHotWalletAddress(wallet_field, old_wallet_address, new_wallet_address, private_key, data.email_id, (error, result) => {
									if(error) {
										res.send(error.statusCode, { error: error.body.message });
										return next();
									} else {
										res.send({ messsage: 'Wallet address edited successfully' });
										return next();
									}
								});
							} else {
								res.send(412, { error: 'Missing field in the request body (expected: new_wallet_address and private_key)' });
								return next();
							}
						} else {
							res.send(412, { error: 'Missing field in the request URL params (expected: old_wallet_address)' });
							return next();
						}
					} else {
						res.send(400, { error: 'Invalid wallet_field'});
						return next();
					}
				} else {
					res.send(401, { error: "Unauthorized Access" });
					return next();
				}
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _getWithdrawalSettings(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				if(data.role == userRoles.SUPER_ADMIN && data.email_id == config.superAdminEmailAddress){
					getWithdrawalSettings(req, function(err, result) {
						if(err) {
							res.send(err.statusCode, { error: err.body.message });
							return next(err);
						} else {
							res.send(200, result);
							return next();
						}
					});
				} else {
					res.send(401, { error: "Unauthorized Access" });
					return next();
				}
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _updateWithdrawalSettings(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				if(data.role == userRoles.SUPER_ADMIN && data.email_id == config.superAdminEmailAddress){
					updateWithdrawalSettings(req, data.email_id, function(err, result) {
						if(err) {
							res.send(err.statusCode, { error: err.body.message });
							return next();
						} else {
							res.send(200, { msg: "Success" });
							return next();
						}
					});
				} else {
					res.send(401, { error: "Unauthorized Access" });
					return next();
				}
			} else {
				res.send(401, { error: "Unauthorized Request" });
				return next();
			}
		});
	}

	function _getSettings(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				getSettings(req, function(err, result) {
					if(err) {
						res.send(err.statusCode, { error: err.body.message });
						return next(err);
					} else {
						res.send(200, result);
						return next();
					}
				});
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _updateSettings(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				isAdminUser(data.email_id, (error, isAdminUserFlag) => {
					if(isAdminUserFlag && data.isAdminPanel) {
						updateSettings(req, data.email_id, function(err, result) {
							if(err) {
								res.send(err.statusCode, { error: err.body.message });
								return next();
							} else {
								res.send(200, { msg: "Success" });
								return next();
							}
						});
					} else {
						res.send(401, { error: "Unauthorized Request" });
						return next();
					}
				});
			} else {
				res.send(401, { error: "Unauthorized Request" });
				return next();
			}
		});
	}

	function _getGasValue(req, res, next) {
		getGasValue(function(err, result) {
			if(err) {
				res.send({
					code: err.code,
					error: 1,
					message: err.message
				});
				return next();
			} else {
				res.send({
					code: 200,
					message: "Operation succeeded",
					data: {
						gas_speed: result
					}
				});
				return next();
			}
		});
	}

	function _getBalanceThreshold(req, res, next) {
		getBalanceThreshold(function(err, result) {
			if(err) {
				res.send({
					code: err.code,
					error: 1,
					message: err.message
				});
				return next();
			} else {
				res.send({
					code: 200,
					message: "Operation succeeded",
					data: result
				});
				return next();
			}
		});
	}

	function sendRestartNotif(req, res, next) {
		const mailOptions = {
			from: "info@pandobrowser.com",
			to: config.superAdminEmailAddress,
			subject: "[ALERT] Crypto API Server Started",
			text: `We detected that the Crypto API Server has been restarted at around ${new Date()}. Please add the hot wallet again here ${config.adminPanelUrl} for the token withdrawal function to proceed.`
		}

		transporter.sendMail(mailOptions, (error, info) => {
			if(info) console.log(`Email sent to ${config.superAdminEmailAddress}: ${info.response}`);
			res.send({
				code: 200,
				message: "Operation succeeded"
			});
			return next();
		});
	}

	function sendBalanceNotif(req, res, next) {
		const wallet = req.params.wallet_address || '';

		if(wallet) {
			const mailOptions = {
				from: "info@pandobrowser.com",
				to: config.superAdminEmailAddress,
				subject: "[ALERT] Pando Wallet Balance",
				text: `The wallet address ${wallet} already reached the threshold value. Please check the wallet here ${config.adminPanelUrl} and top up if needed.`
			}

			transporter.sendMail(mailOptions, (error, info) => {
				if(info) console.log(`Email sent to ${config.superAdminEmailAddress}: ${info.response}`);

				sendBalanceNotifToPando(wallet);

				res.send({
					code: 200,
					message: "Operation succeeded"
				});
				return next();
			});
		} else {
			res.send({
				code: 200,
				message: "Operation succeeded"
			});
			return next();
		}
	}

	function sendBalanceNotifToPando(walletAddress) {
		Settings.findOne({}, (error, settings) => {
			if(settings && settings.pando_notif_email) {
				const pandoEmail = settings.pando_notif_email;
				const balanceNotifMailTemplate = './templates/threshold-email.html';
				
				fs.readFile(balanceNotifMailTemplate, "utf8", function (error, data) {
		            if(error){
		            	log.error('Send balance notif - Error reading template file');
		            }else{
		            	axios.get(`${config.cryptoApiUrl}/balance/${walletAddress}`)
							.then(cResult => {
								if(cResult.data.code === 200){
									const eth_balance = cResult.data.data.eth ? parseFloat(cResult.data.data.eth).toFixed(8) : 0;
									const pando_balance = cResult.data.data.pando ? parseFloat(cResult.data.data.pando).toFixed(8) : 0;

									const mailOptions = {
					                    from: 'info@pandobrowser.com',
					                    to: pandoEmail,
					                    subject: '[ALERT] Pando Wallet Balance',
					                    html: data.replace('{{walletAddress}}', walletAddress)
					                    		.replace('{{ethBalance}}', eth_balance)
					                    		.replace('{{pandoBalance}}', pando_balance)
					                };

					                transporter.sendMail(mailOptions, function(error, info){
					                    if (error) {
					                        log.error(error);
					                    } else {
					                    	log.info('Email sent to ' + pandoEmail + ' - ' + info.response);
					                    }
					                });
								} else {
									log.error('Error fetching wallet balance - ' + walletAddress);
								}
							})
							.catch(error => {
								log.error(error);
							});
		            }
		        });
			} else {
				log.info('Pando Notif Email not set');
			}
		});
	}
}