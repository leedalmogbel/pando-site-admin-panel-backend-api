const readline = require('readline');
const { Writable } = require('stream');

const UsersElapsedTime = require('../app/models/userElapsedTime');
const PassiveMiningUserElapsedTimes = require('../app/models/passiveMiningUserElapsedTime');
const Users = require('../app/models/users');
const dbConnection = require('./scripts-db-connection');

const fs = require('fs')
const path = require('path');
const writer = fs.createWriteStream(path.join(__dirname, 'suspected-users-list.txt'), {
	flags: 'a' // 'a' means appending (old data will be preserved)
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

function askElapsedTimeThreshold() {
	rl.question('Elapsed Time Threshold (0 - All Users): ', threshold => {
		if(threshold >= 0) {
			UsersElapsedTime.distinct('user_id', { elapsed_time: { $gte: threshold }}, (error, userIds) => {
				if(error) {
					console.log(error);
				} else {
					getUsersInfo(userIds);
				}
			});
		}
	});
}

function getUsersInfo(userIds) {
	userIds.forEach(userId => {
		Users.findById(userId, (error, user) => {
			if(user){
				PassiveMiningUserElapsedTimes.aggregate([
			        { $match: { user_id: userId } },
			        { $group: { _id: null, 
					            elapsed_pando_earned: { $sum: "$elapsed_pando_earned" }
					        } }
			    ], function(error1, result1){
			    	const passive_mining_elapsed_pando_earned = result1[0] ? result1[0].elapsed_pando_earned : 0;

			    	UsersElapsedTime.aggregate([
				        { $match: { user_id: userId } },
				        { $group: { _id: null, 
						            elapsed_pando_earned: { $sum: "$elapsed_pando_earned" },
						            referral_pando_earned: { $sum: "$referral_pando_earned" }
						        } }
				    ], function(error2, result2){
				    	const elapsed_pando_earned = result2[0] ? result2[0].elapsed_pando_earned : 0;
				    	const referral_pando_earned = result2[0] ? result2[0].referral_pando_earned : 0;

				    	const full_name = user.full_name ? cleanFullName(user.full_name) : '';

				    	console.log(`${user._id}, ${user.email_id}, ${full_name}, ${elapsed_pando_earned}, ${referral_pando_earned}, ${passive_mining_elapsed_pando_earned}`);
						writer.write(`${user.email_id};${full_name};${elapsed_pando_earned};${referral_pando_earned};${passive_mining_elapsed_pando_earned}\n`);
				    });
			    });
			}
		});
	});
}

function cleanFullName(fullName) {
	if(fullName.includes(';')){
		return cleanFullName(fullName.replace(';', ' '));
	} else {
		return fullName;
	}
}

dbConnection().then(() => {
	askElapsedTimeThreshold();
}).catch(error => { console.log('Something went wrong!') });