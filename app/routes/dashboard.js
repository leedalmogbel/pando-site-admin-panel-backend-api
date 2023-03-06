const { getStatistics, getRecentTransactions } = require('./modules/dashboard-manager');

const API_BASE_PATH = "/dashboard";
const API_VERSION = "1.0.0";

module.exports = function(server) {
	server.get({
		path: API_BASE_PATH + "/statistics",
		version: API_VERSION
	}, statistics);

	server.get({
		path: API_BASE_PATH + "/graph-statistics",
		version: API_VERSION
	}, graphStatistics);

	server.get({
		path: API_BASE_PATH + "/recent-transactions"
	}, recentTransactions);

	function statistics(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				getStatistics(req, function(err, result) {
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

	function graphStatistics(req, res, next) {
		res.send({ msg: "This endpoint is not yet available" });
		return next();
	}

	function recentTransactions(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				getRecentTransactions(req, function(err, result) {
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
}
