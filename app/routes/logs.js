const { getLogs } = require('./modules/log-manager');
const { getHotWalletUpdateLogs, getWithdrawalSettingsUpdateLogs, getTransactionFeeUpdateLogs } = require('./modules/update-logs-manager');

const API_BASE_PATH = "/logs";
const API_VERSION = "1.0.0";

module.exports = function(server) {
	server.get({
		path: API_BASE_PATH,
		version: API_VERSION
	}, _getLogs);

	server.get({
		path: API_BASE_PATH + '/hot-wallet-address',
		version: API_VERSION
	}, _getHotWalletUpdateLogs);

	server.get({
		path: API_BASE_PATH + '/withdrawal-settings',
		version: API_VERSION
	}, _getWithdrawalSettingsUpdateLogs);

	server.get({
		path: API_BASE_PATH + '/transaction-fee',
		version: API_VERSION
	}, _getTransactionFeeUpdateLogs);

	function _getTransactionFeeUpdateLogs(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				getTransactionFeeUpdateLogs((error, logs) => {
					if(error) {
						res.send(error.code, { error: error.message });
						return next();
					} else {
						res.send({ logs });
						return next();
					}
				});
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _getWithdrawalSettingsUpdateLogs(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				getWithdrawalSettingsUpdateLogs((error, logs) => {
					if(error) {
						res.send(error.code, { error: error.message });
						return next();
					} else {
						res.send({ logs });
						return next();
					}
				});
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _getHotWalletUpdateLogs(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				getHotWalletUpdateLogs((error, logs) => {
					if(error) {
						res.send(error.code, { error: error.message });
						return next();
					} else {
						res.send({ logs });
						return next();
					}
				});
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _getLogs(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				getLogs(req)
					.then(result => {
						res.send(result);
						return next();
					})
					.catch(error => {
						res.send(500, { error: "Error while fetching logs from database" });
						return next();
					});
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}
}