const API_BASE_PATH = "/withdraw";
const API_VERSION = "1.0.0";

const { superAdminUserCheck } = require('../common/auth-middlewares');
const { updateWithdrawStatus, getWithdrawTransactions, getWithdrawTransactionsStatistics, getTotalWithdrawn, addWithdrawIncrement } = require('./modules/withdraw-manager');

module.exports = function(server) {
	server.post({
		path: API_BASE_PATH + '/update-status',
		version: API_VERSION
	}, _updateWithdrawStatus);

	server.get({
		path: API_BASE_PATH + '/transactions',
		version: API_VERSION
	}, _getWithdrawTransactions);

	server.get({
		path: API_BASE_PATH + '/transactions-statistics',
		version: API_VERSION
	}, _getWithdrawTransactionsStatistics);

	server.get({
		path: API_BASE_PATH + '/total-withdrawn',
		version: API_VERSION
	}, _getTotalWithdrawn);

	server.post({
		path: API_BASE_PATH + '/increment-overall-withdraw',
		version: API_VERSION
	}, superAdminUserCheck, _addWithdrawIncrement);

	function _addWithdrawIncrement(req, res, next) {
		addWithdrawIncrement(req, (error, result) => {
			if(error) {
				res.send(error.code, { error: error.message });
				return next();
			} else {
				res.send({ message: 'Ok' });
				return next();
			}
		});
	}

	function _getTotalWithdrawn(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				getTotalWithdrawn(req, (error, result) => {
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
		});
	}

	function _getWithdrawTransactionsStatistics(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				getWithdrawTransactionsStatistics(req, (error, result) => {
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
		});
	}

	function _getWithdrawTransactions(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				getWithdrawTransactions(req, (error, result) => {
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
		});
	}

	function _updateWithdrawStatus(req, res, next) {
		updateWithdrawStatus(req, (error, result) => {
			if(error) {
				res.send({
					code: error.code,
					error: 1,
					message: error.message
				});
				return next();
			} else {
				res.send({
					code: 200,
					message: 'Withdraw status updated'
				});
				return next();
			}
		});
	}
}