const readline = require('readline');
const { Writable } = require('stream');

const UsersElapsedTime = require('../app/models/userElapsedTime');
const PassiveMiningUserElapsedTimes = require('../app/models/passiveMiningUserElapsedTime');
const Users = require('../app/models/users');
const Withdrawal = require('../app/models/withdrawal');
const UsersPlans = require('../app/models/userPlans');
const Plans = require('../app/models/plans');
const dbConnection = require('./scripts-db-connection');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
	path: `top-earners-report/Top_Earners_Report-${(new Date()).toISOString()}.csv`,
	header: [
		{id: 'name', title: 'Name'},
		{id: 'email', title: 'Email'},
		{id: 'date_registered', title: 'Date Registered'},
		{id: 'elapsed_time', title: 'Runtime Total Elapsed Time (Seconds)'},
		{id: 'elapsed_pando_earned', title: 'Runtime Earning'},
		{id: 'referral_pando_earned', title: 'Referral Earning'},
		{id: 'passive_mining_elapsed_pando_earned', title: 'Passive Earning'},
		{id: 'total_earnings', title: 'Total Earnings'},
		{id: 'total_withdraw', title: 'Total Withdraw'},
		{id: 'plan', title: 'Plan'},
	]
});

let mute = false;
const mutableStdout = new Writable({
	write: (chunk, encoding, callback) => {
		if(!mute) {
			process.stdout.write(chunk, encoding);
		}
		callback();
	}
});

const rl = readline.createInterface({
	input: process.stdin,
	output: mutableStdout,
	terminal: true
});

function generateReport() {
	const top = 20;

	UsersElapsedTime.distinct('user_id', (error, userIds) => {
		if(error) {
			console.log(error);
		} else {
			const userEarningsWithdraw = [];
			const getUserEarningsAndWithdraw = userIds.map(async (userId) => {
				await Users.findById(userId)
					.then(async (user) => {
						if(user){
							const userDetails = { 
								userId,
								name: user.full_name,
								email: user.email_id,
								date_registered: user.createdAt.toISOString()
							};

							await PassiveMiningUserElapsedTimes.aggregate([
						        { $match: { user_id: userId } },
						        { $group: { _id: null, 
								            elapsed_pando_earned: { $sum: "$elapsed_pando_earned" }
								        } }
						    ]).then(result1 => {
						    	const passive_mining_elapsed_pando_earned = result1[0] ? result1[0].elapsed_pando_earned : 0;
						    	userDetails.passive_mining_elapsed_pando_earned = passive_mining_elapsed_pando_earned;

						    }).catch(error => {
						    	console.log(error);
						    });

					    	await UsersElapsedTime.aggregate([
						        { $match: { user_id: userId } },
						        { $group: { _id: null, 
								            elapsed_pando_earned: { $sum: "$elapsed_pando_earned" },
								            elapsed_time: { $sum: "$elapsed_time" }
								        } }
						    ]).then(result2 => {
						    	const elapsed_pando_earned = result2[0] ? result2[0].elapsed_pando_earned : 0;
						    	const elapsed_time = result2[0] ? result2[0].elapsed_time : 0;

						    	userDetails.elapsed_pando_earned = elapsed_pando_earned;
						    	userDetails.elapsed_time = elapsed_time;

						    }).catch(error => {
						    	console.log(error);
						    });

						    await UsersElapsedTime.aggregate([
						        { $match: { ref_user_id: userId } },
						        { $group: { _id: null, 
								            referral_pando_earned: { $sum: "$referral_pando_earned" }
								        } }
						    ]).then(result2 => {
						    	const referral_pando_earned = result2[0] ? result2[0].referral_pando_earned : 0;

						    	userDetails.referral_pando_earned = referral_pando_earned;
						    	userDetails.total_earnings = userDetails.passive_mining_elapsed_pando_earned + userDetails.elapsed_pando_earned + userDetails.referral_pando_earned;

						    }).catch(error => {
						    	console.log(error);
						    });

						    await Withdrawal.aggregate([
						        { $match: { user_id: userId } },
						        { $group: { _id: null, 
								            total_withdraw: { $sum: "$total_amount" }
								        } }
						    ]).then(result3 => {
						    	const total_withdraw = result3[0] ? result3[0].total_withdraw : 0;
						    	userDetails.total_withdraw = total_withdraw;

						    }).catch(error => {
						    	console.log(error);
						    });

						    userEarningsWithdraw.push(userDetails);
						}
					}).catch(error => {
						console.log(error);
					});
			});

			Promise.all(getUserEarningsAndWithdraw).then(async () => {
				userEarningsWithdraw.sort((a, b) => {
					if(a.total_earnings > b.total_earnings) {
						return -1;
					} else if(a.total_earnings < b.total_earnings) {
						return 1;
					} else {
						return 0;
					}
				});

				const userWithPlans = [];
				const userWithNoPlans = [];

				const segregateUsers = userEarningsWithdraw.map(async (user) => {
					if(userWithPlans.length < top || userWithNoPlans.length < top) {
						await UsersPlans.findOne({ user_id: user.userId })
							.then(async (userPlan) => {
								user.plan = 0;
								if(userPlan) {
									await Plans.findById(userPlan.purchased_plan_id)
										.then(plan => {
											user.plan = plan.amount;
										}).catch(error => {
											console.log(error);
										});
								}

								if(user.plan){
									if(userWithPlans.length < top) {
										userWithPlans.push(user);
									}
								} else {
									if(userWithNoPlans.length < top) {
										userWithNoPlans.push(user);
									}
								}
							}).catch(error => {
								console.log(error);
							});
					}
				});

				Promise.all(segregateUsers).then(() => {
					csvWriter
					  .writeRecords(userWithNoPlans.concat(userWithPlans))
					  .then(()=> {
					  	console.log('The CSV file was written successfully')
					  	process.exit();
					  });
				});
			});
		}
	});
}

dbConnection().then(() => {
	generateReport();
}).catch(error => { console.log('Something went wrong!') });