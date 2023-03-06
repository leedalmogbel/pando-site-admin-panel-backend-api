const { getMiningHistory, getUsers, getUsersStatistics, 
	deleteUser, getUser, updateUser, setPassword, getPassiveMiningHistory, getReferralEarningLogs } = require('./modules/user-manager');
const { checkImportFile, saveUsers } = require('./modules/import-file-manager');
const { saveLog } = require('./modules/log-manager');
const { getPlansByUser } = require('./modules/plans-manager');

const { isAdminUser } = require('./modules/admin-user-manager');
const { adminUserCheck, superAdminUserCheck } = require('../common/auth-middlewares');

const multer = require('multer');
const upload = multer();

const mongoose = require('mongoose');
const Logs = mongoose.model('Logs');

const API_BASE_PATH = "/users";
const API_VERSION = "1.0.0";

module.exports = function(server) {
	server.get({
		path: API_BASE_PATH + "/mining-history/:userId",
		version: API_VERSION
	}, _getMiningHistory);

	server.get({
		path: API_BASE_PATH + "/passive-mining-history/:userId",
		version: API_VERSION
	}, _getPassiveMiningHistory);

	server.get({
		path: API_BASE_PATH + "/referral-earning-logs/:userId",
		version: API_VERSION
	}, _getReferralEarningLogs);

	server.get({
		path: API_BASE_PATH,
		version: API_VERSION
	}, adminUserCheck, _getUsers);

	server.get({
		path: API_BASE_PATH + "/:userId",
		version: API_VERSION
	}, _getUser);

	server.put({
		path: API_BASE_PATH + "/:userId",
		version: API_VERSION
	}, _updateUser);

	server.get({
		path: API_BASE_PATH + "/statistics",
		version: API_VERSION
	}, _getUsersStatistics);

	server.del({
		path: API_BASE_PATH + "/:userId",
		version: API_VERSION
	}, _deleteUser);

	server.post({
		path: API_BASE_PATH + "/check-import-file",
		version: API_VERSION
	}, upload.single('csvFile'), _importUsersFromFile);

	server.post({
		path: API_BASE_PATH + "/save-users-from-file",
		version: API_VERSION
	}, upload.single('csvFile'), _saveUsersFromFile);

	server.get({
		path: API_BASE_PATH + "/plans/:userId",
		version: API_VERSION
	}, _getPlans);

	server.post({
		path: API_BASE_PATH + "/set-password/:userId",
		version: API_VERSION
	}, _setPassword);

	function _setPassword(req, res, next) {
		setPassword(req, function(error, result) {
			if(error) {
				res.send(error.statusCode, { error: error.body.message });
				return next();
			} else {
				res.send({ msg: "success" });
				return next();
			}
		});
	}

	function _updateUser(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				isAdminUser(data.email_id, (error, isAdminUserFlag) => {
					if(isAdminUserFlag && data.isAdminPanel) {
						updateUser(req, function(err, result){
							if(err){
								res.send(err.statusCode, { err: err.body.message });
							}else{
								res.send(result);
							}
							return next();
						});
					} else {
						res.send(401, { error: "Unauthorized Access" });
						return next();
					}
				});
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _getUser(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				getUser(req, function(err, result){
					if(err){
						res.send(err.statusCode, { err: err.body.message });
					}else{
						res.send(result);
					}
					return next();
				});
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _getPlans(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				const userId = req.params.userId;
				if(userId){
					getPlansByUser(userId)
						.then(result => {
							res.send(result);
							return next();
						})
						.catch(error => {
							res.send(500, { error: "Error while fetching list of plans of the user" });
							return next();
						});
				} else {
					res.send(409, { error: "Missing parameter - userId" });
					return next();
				}
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _saveUsersFromFile(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				isAdminUser(data.email_id, (error, isAdminUserFlag) => {
					if(isAdminUserFlag && data.isAdminPanel) {
						checkImportFile(req, function(err, result) {
							let logDetails = '';

							if(err){
								if(err.error_row_count > 0){
									const response = {
										error: true,
										validation_error: true, 
										message: err.err.body.message,
										error_row_count: err.error_row_count,
										rows: err.error_details
									};
									res.send(response);
									logDetails = JSON.stringify(response);
								} else {
									const response = {
										error: true, 
										validation_error: true,
										message: err.err.body.message,
										error_row_count: err.error_row_count,
										rows: err.error_details
									};
									res.send(err.err.statusCode, response);
									logDetails = JSON.stringify(response);
								}

								session.load(req.header('session-id'), function(err, data) {
						            if (data) {
						            	const uploadLog = new Logs({
						            		uploaded_file_name: req.files.csvFile.name,
						            		log_type: 'csv-file-validation',
						            		log_details: logDetails,
						            		created_by: data.email_id
						            	});
						            	saveLog(uploadLog);
						            }
						        });

								return next();

							}else{
								saveUsers(result, function(err, results){
									if(results.rowCountWithErrors){
										const response = { 
											error: true,
											validation_error: false,
											message: "There are users that were not saved into the database because of database connection error",
											rows: results.rows,
											existing_users_count: results.existing_users_count,
											new_users_count:  results.new_users_count
										};
										res.send(response);
										logDetails = JSON.stringify(response);
									} else {
										const response = { 
											error: false, 
											validation_error: false, 
											message: "All users and their purchased plans was successfully saved into the database", 
											rows: result,
											existing_users_count: results.existing_users_count,
											new_users_count:  results.new_users_count
										};
										res.send(response);
										logDetails = JSON.stringify(response);
									}

									session.load(req.header('session-id'), function(err, data) {
							            if (data) {
							            	const uploadLog = new Logs({
							            		uploaded_file_name: req.files.csvFile.name,
							            		log_type: 'save-users-plans-to-database',
							            		log_details: logDetails,
							            		created_by: data.email_id
							            	});
							            	saveLog(uploadLog);
							            }
							        });

									return next();
									
								});
							}
						});
					} else {
						res.send(401, { error: "Unauthorized Access" });
						return next();
					}
				});
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _importUsersFromFile(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				isAdminUser(data.email_id, (error, isAdminUserFlag) => {
					if(isAdminUserFlag && data.isAdminPanel) {
						checkImportFile(req, function(err, result) {
							let logDetails = '';

							if(err){
								if(err.error_row_count > 0){
									const response = { 
										error_message: err.err.body.message,
										error_row_count: err.error_row_count,
										rows: err.error_details
									};
									res.send(response);
									logDetails = JSON.stringify(response);
								} else {
									const response = { 
										error_message: err.err.body.message,
										error_row_count: err.error_row_count,
										rows: err.error_details
									};
									res.send(err.err.statusCode, response);
									logDetails = JSON.stringify(response);
								}
							}else{
								const response = { 
									error_message: "No errors found in the CSV file",
									error_row_count: 0,
									rows: result
								};
								res.send(response);
								logDetails = JSON.stringify(response);
							}

							session.load(req.header('session-id'), function(err, data) {
					            if (data) {
					            	const uploadLog = new Logs({
					            		uploaded_file_name: req.files.csvFile.name,
					            		log_type: 'csv-file-validation',
					            		log_details: logDetails,
					            		created_by: data.email_id
					            	});
					            	saveLog(uploadLog);
					            }
					        });

							return next();
						});
					} else {
						res.send(401, { error: "Unauthorized Access" });
						return next();
					}
				});
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _getReferralEarningLogs(req, res, next) {
		getReferralEarningLogs(req, function(error, result) {
			if(error) {
				res.send(error.statusCode, { error: error.body.message });
				return next();
			} else {
				res.send(result);
				return next();
			}
		});
	}

	function _getPassiveMiningHistory(req, res, next) {
		getPassiveMiningHistory(req, function(error, result) {
			if(error) {
				res.send(error.statusCode, { error: error.body.message });
				return next();
			} else {
				res.send(result);
				return next();
			}
		});
	}

	function _getMiningHistory(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				getMiningHistory(req, function(err, result) {
					if(err){
						res.send(err.statusCode, { error: err.body.message });
					}else{
						res.send(result);
					}
					return next();
				});
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _getUsers(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				getUsers(req, function(err, result) {
					if(err){
						res.send(err.statusCode, { error: err.body.message });
					}else{
						res.send(result);
					}
					return next();
				});
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _getUsersStatistics(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				getUsersStatistics(req, function(err, result) {
					if(err){
						res.send(err.statusCode, { error: err.body.message });
					}else{
						res.send(result);
					}
					return next();
				});
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _deleteUser(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				isAdminUser(data.email_id, (error, isAdminUserFlag) => {
					if(isAdminUserFlag && data.isAdminPanel) {
						deleteUser(req, function(err, result) {
							if(err){
								res.send(err.statusCode, { error: err.body.message });
							}else{
								res.send(result);
							}
							return next();
						});
					} else {
						res.send(401, { error: "Unauthorized Action" });
						return next();
					}
				});
			} else {
				res.send(401, { error: "Unauthorized Action" });
				return next();
			}
		});
	}
}