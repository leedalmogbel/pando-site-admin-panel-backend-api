const { getPlans, getPlan, addPlan, updatePlan } = require('./modules/plans-manager');
const { updateMiningLogsWhenPlanPassivingMiningRateUpdatedv2 } = require('./modules/passive-mining');
const { saveLog } = require('./modules/update-logs-manager');

const { isAdminUser } = require('./modules/admin-user-manager');

const mongoose = require('mongoose');
const UpdateLogs = mongoose.model("UpdateLogs");

const API_BASE_PATH = "/plans";
const API_VERSION = "1.0.0";

module.exports = function(server) {
	server.get({
		path: API_BASE_PATH,
		version: API_VERSION
	}, _getPlans);

	server.get({
		path: API_BASE_PATH + "/:planId",
		version: API_VERSION
	}, _getPlan);

	server.post({
		path: API_BASE_PATH,
		version: API_VERSION
	}, _addPlan);

	server.put({
		path: API_BASE_PATH + "/:planId",
		version: API_VERSION
	}, _updatePlan);

	function _getPlans(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				getPlans()
					.then(plans => {
						res.send({ plans });
						return next();
					})
					.catch(error => {
						res.send(500, { error: "Error occured while fetching list of plans from the database" });
						return next();
					});
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _getPlan(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				const planId = req.params.planId;
				if(planId){
					getPlan(planId)
						.then(plan => {
							res.send(plan);
							return next();
						})
						.catch(error => {
							res.send(500, { error: "Error occured while fetching plan from the database" });
							return next();
						});
				}else{
					res.send(412, { error: "Missing plandId in the URL parameter" })
					return next();
				}
			} else {
				res.send(401, { error: "Unauthorized Access" });
				return next();
			}
		});
	}

	function _addPlan(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				isAdminUser(data.email_id, (error, isAdminUserFlag) => {
					if(isAdminUserFlag) {
						const plan = req.body;
						if(plan.membership_name
							&& plan.amount
							&& plan.booster_rate) {
							addPlan(plan)
								.then(result => {
									res.send(result);
									return next();
								})
								.catch(error => {
									if(error.duplicate){
										res.send(409, { error: "Plan amount already exists" });
										return next();
									} else {
										res.send(500, { error: "Error occured while saving plan to the database" });
										return next();
									}
								});
						} else {
							res.send(412, { error: "Missing required fields in request body" });
							return next();
						}
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

	function _updatePlan(req, res, next) {
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				isAdminUser(data.email_id, (error, isAdminUserFlag) => {
					if(isAdminUserFlag) {
						const planId = req.params.planId;
						const plan = req.body;

						if(planId && plan) {
							updatePlan(planId, plan)
								.then(result => {
									if(plan.passive_mining_rate){ // update mining logs of users under this plan
										updateMiningLogsWhenPlanPassivingMiningRateUpdatedv2(planId, plan.passive_mining_rate);				
									}

									const updateLog = new UpdateLogs({
										log_model: 'plan',
										log_details: JSON.stringify(plan),
										created_by: data.email_id
									});

									saveLog(updateLog);

									res.send(result);
									return next();
								})
								.catch(error => {
									console.log(error);
									if(error.duplicate){
										res.send(409, { error: "Plan amount already exists" });
										return next();
									} else {
										res.send(500, { error: "Error occured while saving plan to the database" });
										return next();
									}
								});
						} else {
							res.send(412, { error: "Missing planId in the URL parameter or request body" });
							return next();
						}
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
}