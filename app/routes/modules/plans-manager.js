const mongoose = require("mongoose");
const Users = mongoose.model("Users");
const Plans = mongoose.model("Plans");
const UsersPlans = mongoose.model("UsersPlans");

const getPlans = function() {
	return new Promise((resolve, reject) => {
		Plans.find().sort({ amount: -1 })
			.then(plans => {
				resolve(plans);
			})
			.catch(error => {
				reject(error);
			});
	});
}

const getPlan = function(planId) {
	return new Promise((resolve, reject) => {
		Plans.findOne({ _id: planId })
			.then(result => {
				resolve(result);
			})
			.catch(error => {
				reject(error);
			});
	});
}

const addPlan = function(plan) {
	return new Promise((resolve, reject) => {
		getPlanByAmount(plan.amount)
			.then(result => {
				if(result){
					reject({ duplicate: true });
				}else{
					const planDoc = new Plans(plan);
						planDoc.save()
							.then(result => {
								resolve(result);
							})
							.catch(error => {
								reject(error);
							});
				}
			})
			.catch(error => {
				reject(error);
			});

		
	});
}

const updatePlan = function(planId, plan) {
	return new Promise((resolve, reject) => {
		if(plan.amount){
			Plans.findOne({ amount: plan.amount, _id: { $ne: planId } })
				.then(result => {
					if(result) {
						reject({ duplicate: true });
					} else {
						Plans.updateOne({ _id: planId }, plan)
							.then(result => {
								resolve(result);
							})
							.catch(error => {
								reject(error);
							});
					}
				})
				.catch(error => {
					reject(error);
				});
		} else {
			Plans.updateOne({ _id: planId }, plan)
				.then(result => {
					resolve(result);
				})
				.catch(error => {
					reject(error);
				});
		}	
	});
}

const getPlansByUser = function(userId) {
	return new Promise((resolve, reject) => {
		UsersPlans.find({ user_id: userId })
			.then(plans => {
				let totalPlanAmount = 0;
				const updatedPlans = [];

				const getPlanValues = plans.map(async (p) => {
					const pDoc = p._doc;
					await Plans.findOne({ _id: pDoc.purchased_plan_id })
						.then(plan => {
							const planDoc = {};
							planDoc._id = p._id;
							planDoc.plan_amount = plan.amount;
							planDoc.plan_name = plan.membership_name;
							planDoc.plan_logo_name = plan.logo_name;
							planDoc.date_purchased = p.purchased_date;
							planDoc.booster_rate = plan.booster_rate;
							planDoc.createdAt = p.createdAt;
							totalPlanAmount += plan.amount;
							updatedPlans.push(planDoc);
						})
						.catch(error => {
							reject(error);
						});
				});

				Promise.all(getPlanValues).then(() => {
					updatedPlans.sort(function(a, b) {
						if(a.createdAt.getTime() < b.createdAt.getTime()){
							return 1;
						} else if(a.createdAt.getTime() > b.createdAt.getTime()) {
							return -1;
						}else {
							return 0
						}
					});
					resolve({ total_plan_amount: totalPlanAmount, plans: updatedPlans });
				}).catch(error => {
					reject(error);
				});
			})
			.catch(error => {
				reject(error);
			});
	});
}

const getPlanByUser = function(userId) {
	return new Promise((resolve, reject) => {
		UsersPlans.find({ user_id: userId }).sort({ createdAt: -1 }).limit(1).skip(0)
			.then(userPlan => {
				if(userPlan.length){
					Plans.findOne({ _id: userPlan[0].purchased_plan_id })
						.then(plan => {
							if(plan){
								const pDoc = {};
								pDoc.plan_amount = plan.amount;
								pDoc.plan_name = plan.membership_name;
								pDoc.plan_logo_name = plan.logo_name;
								pDoc.booster_rate = plan.booster_rate;
								pDoc.date_purchased = userPlan[0].purchased_date;
								resolve(pDoc);
							} else {
								resolve({});
							}
							return null;
						})
						.catch(error => {
							reject(error);
						});
				} else {
					resolve({});
				}
				return null;
			})
			.catch(error => {
				return reject(error);
			});
	});
}

const getPlanByUserEmail = function(email, callback) {
	Users.findOne({ email_id: email, is_deleted: 0 })
		.then(user => {
			if(user){
				getPlanByUser(user._id)
					.then(plan => {
						callback(null, plan);
					})
					.catch(error => {
						callback(error, null);
					})
			}else{
				callback(null, {});
			}
		})
		.catch(error => {
			callback(error, null);
		});
}

const getPlanByUserEmailPromise = function(email) {
	return new Promise((resolve, reject) => {
		Users.findOne({ email_id: email, is_deleted: 0 })
			.then(user => {
				if(user){
					getPlanByUser(user._id)
						.then(plan => {
							resolve(plan);
						})
						.catch(error => {
							reject(error);
						})
				}else{
					resolve({});
				}
				return null;
			})
			.catch(error => {
				reject(error);
			});
	});
}

const getPlanByAmount = function(planAmount) {
	return new Promise((resolve, reject) => {
		Plans.findOne({ amount: planAmount })
			.then(plan => {
				resolve(plan);
			})
			.catch(error => {
				reject(error);
			})
	});
}

const addUserPlan = function(userPlan) {
	return new Promise((resolve, reject) => {
		userPlan.save()
			.then(result => {
				resolve(result);
			})
			.catch(error => {
				reject(error);
			});
	});
}

module.exports = { getPlans, getPlanByAmount, addUserPlan, getPlansByUser, getPlanByUser, getPlanByUserEmail, getPlanByUserEmailPromise, addPlan, updatePlan, getPlan }