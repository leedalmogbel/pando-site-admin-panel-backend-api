const Users = require('../app/models/users');
const UsersElapsedTime = require('../app/models/userElapsedTime');
const PassiveMiningUserElapsedTimes = require('../app/models/passiveMiningUserElapsedTime');
const Withdrawal = require('../app/models/withdrawal');

const dbConnection = require('./scripts-db-connection');

const readline = require('readline');
const { Writable } = require('stream');

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

dbConnection().then(() => {
	rl.question('User Email (Enter, for all users): ', email => {

		const query = {};

		if(email) {
			query.email_id = email;
		}

		Users.find(query)
		.then(users => {
			if(users.length) {
				console.log(users.length);
				const setUserBalances = users.map(async (user) => {

					const userDetails = {
						runtime_earning: 0,
						referral_earning: 0,
						passive_earning: 0,
						total_withdrawn: 0,
						total_elapsed_time: 0
					};

					// EARNINGS
					await UsersElapsedTime.aggregate([
				        { $match: { user_id: user._id.toString() } },
				        { $group: { _id: null,
				        			elapsed_time: { $sum: "$elapsed_time" },
				        			elapsed_pando_earned: { $sum: "$elapsed_pando_earned" },
						            referral_pando_earned: { $sum: "$referral_pando_earned" }
						        } }
				    ]).then(result => {
				    	if(result && result.length){
				    		userDetails.total_elapsed_time = result[0] ? result[0].elapsed_time : 0;
				    		userDetails.runtime_earning = result[0] ? result[0].elapsed_pando_earned : 0;
				    		userDetails.referral_earning = result[0] ? result[0].referral_pando_earned : 0;
				    	}
				    }).catch(error => {
				    	console.log(user._id, error);
				    });

				    await PassiveMiningUserElapsedTimes.aggregate([
				        { $match: { user_id: user._id.toString() } },
				        { $group: { _id: null, 
				        			elapsed_pando_earned: { $sum: "$elapsed_pando_earned" }
						        } }
				    ]).then(result => {
				    	if(result && result.length){
				    		userDetails.passive_earning = result[0] ? result[0].elapsed_pando_earned : 0;
				    	}
				    })
				    .catch(error => {
				    	console.log(user._id, error);
				    });

				    // WITHDRAWALS
				    await Withdrawal.aggregate([
				        { $match: { user_id: user._id.toString() } },
				        { $group: { _id: null, 
				        			total_amount: { $sum: "$total_amount" }
						        } }
				    ]).then(result => {
				    	if(result && result.length){
				    		userDetails.total_withdrawn = result[0] ? result[0].total_amount : 0;
				    	}
				    })
				    .catch(error => {
				    	console.log(user._id, error);
				    });

				    await Users.updateOne({ _id: user._id.toString() }, { $set: userDetails })
				    	.then(result => {
				    		console.log(user._id, result);
				    	})
				    	.catch(error => {
				    		console.log(user._id, error);
				    	});
				});

				Promise.all(setUserBalances).then(() => {
					process.exit();
				});
			} else {
				console.log('User not found');
				process.exit();
			}
		})
		.catch(error => {
			console.log(error);
		});
	});
}).catch(error => { console.log('Something went wrong!', error) });