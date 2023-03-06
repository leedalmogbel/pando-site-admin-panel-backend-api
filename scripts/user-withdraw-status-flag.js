const dbConnection = require('./scripts-db-connection');
const session = require('restify-session')({ debug: true, ttl: 172800 });

const Users = require('../app/models/users');
const Withdrawal = require('../app/models/withdrawal');

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

function askEmail(callback) {
	rl.question('User email: ', email => {
		if(email) {
			callback(email);
		} else {
			askEmail(callback);
		}
	});
}

function askWithdrawFlagStatusValue(callback) {
	rl.question('Set withdraw flag value (1/0): ', flag => {
		const flagVal = parseInt(flag);
		if(flagVal == 1 || flagVal == 0) {
			callback(flagVal);
		} else {
			askWithdrawFlagStatusValue(callback);
		}
	});
}

dbConnection().then(() => {
	askEmail((email) => {
		Users.findOne({ email_id: email })
			.then(user => {
				if(user) {
					const userId = user._id.toString();
					Withdrawal.findOne({ user_id: userId, $or: [{ status: 0 }, { status: 1 }] })
						.then(withdrawTx => {
							let hasPending = false;
							if(withdrawTx) {
								hasPending = true;
							}

							session.load(userId, (error, userData) => {
								const withdrawStatusFlag = userData ? userData.withdraw_status : false;
								
								console.log('User has pending', hasPending);
								console.log('User withdraw status flag value on redis', withdrawStatusFlag);

								askWithdrawFlagStatusValue((flag) => {
									const flagVal = flag == 1 ? true : false;
									session.save(userId, { withdraw_status: flagVal }, (error, status) => {
										if(error) {
											console.log(error);
											process.exit();
										} else {
											console.log('Withdraw flag status updated to', flagVal);
											process.exit();
										}
									});
								});
							});
						})
						.catch(error => {
							console.log(error);
							process.exit();
						});
				} else {
					console.log('User not found');
					process.exit();
				}
			})
			.catch(error => {
				console.log(error);
				process.exit();
			});
	});
}).catch(error => { console.log('Something went wrong!', error) });