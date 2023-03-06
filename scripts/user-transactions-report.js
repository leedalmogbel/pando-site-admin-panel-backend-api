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
	rl.question('User Email: ', email => {
		if(email) {
			callback(email);
		} else {
			askEmail(callback);
		}
	});
}

function generateReport() {
	askEmail((email) => {
		Users.findOne({ email_id: email })
			.then(async (user) => {
				if(user) {
					let txs = [];

					// runtime
					UsersElapsedTime.find({ user_id: user._id.toString() })
						.then(runtimeMiningLogs => {
							translate(runtimeMiningLogs, [
									{ date: 'createdAt' },
									{ runtime_seconds: 'elapsed_time' }, 
									{ runtime_pando: 'elapsed_pando_earned' }
								], (arr) => {
									txs = txs.concat(arr);

									//referral
									UsersElapsedTime.find({ ref_user_id: user._id.toString() })
										.then(referralLogs => {
											translate(referralLogs, [
													{ date: 'createdAt' },
													{ referral_pando_earned: 'referral_pando_earned' }
												], (arr) => {
													txs = txs.concat(arr);

													// passive
													PassiveMiningUserElapsedTimes.find({ user_id: user._id.toString() })
														.then(passiveMiningLogs => {
															translate(passiveMiningLogs, [
																	{ date: 'createdAt' },
																	{ passive_seconds: 'elapsed_time' }, 
																	{ passive_pando: 'elapsed_pando_earned' }
																], (arr) => {
																	txs = txs.concat(arr);

																	// withdrawals
																	Withdrawal.find({ user_id: user._id.toString() })
																		.then(withdrawalLogs => {
																			translate(withdrawalLogs, [
																					{ date: 'createdAt' },
																					{ withdraw: 'total_amount' }, 
																					{ status: 'status' },
																					{ receiver_address: 'receiver_address' }
																				], (arr) => {
																					txs = txs.concat(arr);

																					txs.sort((a, b) => {
																						if(a.date > b.date) {
																							return -1;
																						} else if(a.date < b.date) {
																							return 1;
																						} else {
																							return 0;
																						}
																					});

																					const userEmail = email.split('@')[0];

																					const csvWriter = createCsvWriter({
																						path: `top-earners-report/User_Transactions_Report-${userEmail}-${(new Date()).toISOString()}.csv`,
																						header: [
																							{id: 'date', title: 'Timestamp'},
																							{id: 'runtime_seconds', title: 'Runtime Seconds Sent'},
																							{id: 'runtime_pando', title: 'Runtime Pando Earned'},
																							{id: 'referral_pando_earned', title: 'Referral Earning'},
																							{id: 'passive_seconds', title: 'Passive Seconds Accumulated'},
																							{id: 'passive_pando', title: 'Passive Pando Earned'},
																							{id: 'withdraw', title: 'Withdraw'},
																							{id: 'status', title: 'Status'},
																							{id: 'receiver_address', title: 'Receiver Wallet Address'}
																						]
																					});

																					csvWriter
																						.writeRecords(txs)
																						.then(()=> {
																							console.log('The CSV file was written successfully')
																							process.exit();
																						});
																			});
																		}).catch(error => {
																			console.log(error);
																		});
															});
														}).catch(error => {
															console.log(error);
														});
											});
										}).catch(error => {
											console.log(error);
										});
							});
						}).catch(error => {
							console.log(error);
						});
				} else {
					console.log('User not found');
					generateReport();
				}
			})
			.catch((error) => {
				console.log(error);
			});
	});
}

function translate(logs, keyMaps, callback) {
	const translatedArr = [];

	const processLogs = logs.map(log => {
		const obj = {};
		keyMaps.forEach(keyMap => {
			const key = Object.keys(keyMap)[0];

			if(key == 'date') {
				obj[key] = log[keyMap[key]].toISOString();
			} else {
				obj[key] = log[keyMap[key]];
			}
		});
		translatedArr.push(obj);
	});

	Promise.all(processLogs).then(() => {
		callback(translatedArr);
	});
}

dbConnection().then(() => {
	generateReport();
}).catch(error => { console.log('Something went wrong!') });