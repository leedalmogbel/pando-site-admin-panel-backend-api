const dbConnection = require('./scripts-db-connection');
const Users = require('../app/models/users');
const UsersElapsedTime = require('../app/models/userElapsedTime');

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
	const filterDateTime = new Date(1604552400000); //exact millis when the first referral reset was executed
	console.log(filterDateTime);
	Users.countDocuments({ referral_by: { $ne: '' }, createdAt: { '$lte': filterDateTime } }, (error, countWithReferrer) => {
		if(error) {
			console.log(error);
		} else {
			if(countWithReferrer){
				console.log('Total users (filtered) with Referrers: ', countWithReferrer);
				console.log('Reset users referral data...');
				rl.question('Proceed? (Y/n): ', answer => {
					if(answer === 'Y' || answer === 'y'){
						Users.find({ referral_by: { $ne: '' }, createdAt: { '$lte': filterDateTime } }, (error, users) => {
							if(error) {
								console.log(error);
							} else {
								users.forEach(user => {
									Users.find({ referral_code: user.referral_by }, (error, referrer) => {
										if(error) {
											console.log(error);
										} else {
											UsersElapsedTime.updateMany({ user_id: referrer._id, ref_user_id: user._id }, { $set: { referral_pando_earned: 0 } }, (error, result) => {
												if(error) {
													console.log(error);
												} else {
													console.log(result);
													console.log(`User: ${user._id} - Referrer: ${referrer._id}`);
												}
											});
										}
									});
								});
							}
						});
					} else {
						console.log('Exited...');
						process.exit();
					}
				});
			} else {
				console.log('All users have no referrer code');
				process.exit();
			}
		}
	});
}).catch(error => { console.log('Something went wrong!', error) });