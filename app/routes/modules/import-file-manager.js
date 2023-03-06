const csv = require('csv-parser');
const neatCsv = require('neat-csv');
const fs = require('fs');
const path = require('path');

const errors = require('restify-errors');
const mongoose = require('mongoose');
const uuid = require('uuid');
const codeGenerator = require('referral-code-generator');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const Users = mongoose.model('Users');
const UsersPlans = mongoose.model('UsersPlans');
const UsersPassword = mongoose.model('UsersPassword');

const { getPlans, getPlanByAmount, addUserPlan, getPlanByUserEmail, getPlanByUserEmailPromise } = require('./plans-manager');
const { checkFileNameIfExists } = require('./log-manager');
const { updateMiningLogsWhenNewPlanIsPurchased } = require('./passive-mining');

const config = require("../../../config/config");

const transporter = nodemailer.createTransport({
	host: config.email.host,
	port: config.email.port,
	secure: config.email.secure,
	auth: {
		user: config.email.auth.user,
		pass: config.email.auth.pass
	}
});

const generateSalt = function() {
    var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
    var salt = '';
    for (var i = 0; i < 10; i++) {
        var p = Math.floor(Math.random() * set.length);
        salt += set[p];
    }
    return salt;
}

const md5 = function(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

const saltAndHash = function(pass) {
	return new Promise((resolve, reject) => {
		try {
			const salt = generateSalt();
			const hash = md5(pass+salt);
			resolve({ salt, hash });
		} catch (error) {
			reject(error);
		}
	});
}

const generateReferralCode = function() {
	return new Promise((resolve, reject) => {
		const referralCode = codeGenerator.alpha('uppercase', 6);

		Users.findOne({ referral_code: referralCode })
			.then(user => {
				if(user){
					generateReferralCode();
				}else{
					resolve(referralCode);
				}
			})
			.catch(error => {
				reject(error);
			});
	});
}

const saveUsers = function(rows, callback) {
	new Promise((resolve, reject) => {
		const rowsWithError = [];
		let existingUsersCount = 0;
		let newUsersCount = 0;
		let rowCountWithErrors = 0;

		const processRows = rows.map(async (row) => {
			row.error_details = [];
			//check if user exist
			await Users.findOne({ email_id: row.email, is_deleted: 0 })
				.then(result => {
					let user = null;
					if(result){ //user exists
						existingUsersCount += 1;

						user = result;
						if(row.username) user.username = row.username;
						if(row.name) user.full_name = row.name;
						if(row.birthdate) user.birthdate = row.birthdate;
						if(row.contact_number) user.contact_number = row.contact_number;

						Users.updateOne({ _id: user._id }, user)
							.then(result => {
								//add plan purchased to usersplans collection
								getPlanByAmount(row.plan_purchased)
									.then(plan => {
										if(plan){
											const userPlan = new UsersPlans({
												user_id: user._id,
												purchased_date: row.date_purchased,
												purchased_plan_id: plan._id
											});
											addUserPlan(userPlan)
												.then(result => { //purchased plan successfully added to usersplans collections
													updateMiningLogsWhenNewPlanIsPurchased(result, plan.passive_mining_rate);
												})
												.catch(error => {
													row.error_details.push("Database error when saving purchased plan with amount " + row.plan_purchased + " in the database");
													//rowsWithError.push(row);
													rowCountWithErrors += 1;
												});
										}else{
											row.error_details.push("Plan with amount " + row.plan_purchased + " does not exists in the list of plans in the database");
											//rowsWithError.push(row);
											rowCountWithErrors += 1;
										}
									})
									.catch(error => {
										row.error_details.push("Database error while fetching plan object for " + row.plan_purchased);
										//rowsWithError.push(row);
										rowCountWithErrors += 1;
									});
							}).catch(error => {
								row.error_details.push("Database error while updating the details of existing user");
								//rowsWithError.push(row);
								rowCountWithErrors += 1;
							});
					} else { //user does not exists - consider country
						newUsersCount += 1;

						user = new Users({
							email_id: row.email,
							username: row.username ? row.username : '',
							full_name: row.name ? row.name : '',
							birthdate: row.birthdate ? row.birthdate : null,
							contact_number: row.contact_number ? row.contact_number : '',
							referral_by: '',
							verify_token: uuid.v4()
						});

						generateReferralCode()
							.then(referralCode => {
								user.referral_code = referralCode;
								user.save()
									.then(savedUser => {
										const generatedPassword = codeGenerator.alphaNumeric('uppercase', 3, 3);
										
										//handle generated password
										saltAndHash(generatedPassword)
											.then(result => {
												const salt = result.salt;
												const hash = result.hash;

												const usersPassword = new UsersPassword({
													user_id: savedUser._id,
					                                user_password: hash,
					                                salt: salt,
												});

												usersPassword.save()
													.then(result => {
														//send generated password to email here
														const sendPasswordTemplate = './templates/password-email.html';
														fs.readFile(sendPasswordTemplate, "utf8", function (error, data) {
							                                if(error){
							                                	console.log("Error reading email template file", savedUser);
							                                }else{
							                                    const mailOptions = {
							                                        from: 'info@pandobrowser.com',
							                                        to: savedUser.email_id,
							                                        subject: 'Welcome to Pando Browser',
							                                        html: data.replace('{{password}}', generatedPassword)
							                                        		.replace('{{name}}', savedUser.full_name)
							                                        		.replace('{{email}}', savedUser.email_id)
							                                        		.replace('{{password_english}}', generatedPassword)
							                                        		.replace('{{name_english}}', savedUser.full_name)
							                                        		.replace('{{email_english}}', savedUser.email_id)
							                                        		.replace('{{set_password_link}}', `${config.adminPanelUrl}/set-password/${savedUser._id}`)
							                                        		.replace('{{set_password_link_english}}', `${config.adminPanelUrl}/set-password/${savedUser._id}`)
							                                    };

							                                    transporter.sendMail(mailOptions, function(error, info){
							                                        if (error) {
							                                            console.log(error);
							                                        } else {
							                                            console.log('Email sent to ' + savedUser.email_id + ' - ' + info.response);
							                                        }
							                                    });
							                                }
							                            });
													})
													.catch(error => {
														row.error_details.push("Error while saving the generated password");
														//rowsWithError.push(row);
														rowCountWithErrors += 1;
													});
											})
											.catch(error => {
												row.error_details.push("Error while hashing the generated password");
												//rowsWithError.push(row);
												rowCountWithErrors += 1;
											});

										//save plans purchased
										getPlanByAmount(row.plan_purchased)
											.then(plan => {
												if(plan){
													const userPlan = new UsersPlans({
														user_id: savedUser._id,
														purchased_date: row.date_purchased,
														purchased_plan_id: plan._id
													});
													addUserPlan(userPlan)
														.then(result => { //purchased plan successfully added to usersplans collections
															updateMiningLogsWhenNewPlanIsPurchased(result, plan.passive_mining_rate);
														})
														.catch(error => {
															row.error_details.push("Database error when saving purchased plan with amount " + row.plan_purchased + " in the database");
															//rowsWithError.push(row);
															rowCountWithErrors += 1;
														});
												}else{
													row.error_details.push("Plan with amount " + row.plan_purchased + " does not exists in the list of plans in the database");
													//rowsWithError.push(row);
													rowCountWithErrors += 1;
												}
											})
											.catch(error => {
												row.error_details.push("Database error while fetching plan object for " + row.plan_purchased);
												//rowsWithError.push(row);
												rowCountWithErrors += 1;
											});
									})
									.catch(error => {
										row.error_details.push("Database error while saving the new user");
										//rowsWithError.push(row);
										rowCountWithErrors += 1;
									});
							})
							.catch(error => {
								row.error_details.push("Database error while generating referral code for the user");
								//rowsWithError.push(row);
								rowCountWithErrors += 1;
							});
					}
				}).catch(error => {
					row.error_details.push("Database error while checking if user exists");
					//rowsWithError.push(row);
					rowCountWithErrors += 1;
				});
				
				rowsWithError.push(row);

		});

		Promise.all(processRows).then(() => {
			resolve({
				rowCountWithErrors: rowCountWithErrors,  
				rows: rowsWithError,
				existing_users_count: existingUsersCount,
				new_users_count: newUsersCount
			});
		});

	}).then(result => {
		callback(null, result);
	});
}

const checkImportFile = function(req, callback) {
	const csvFile = req.files.csvFile;
	if(csvFile){
		checkFileNameIfExists(csvFile.name)
			.then(log => {
				if(log){
					const err = new errors.PreconditionFailedError({
						statusCode: 412
					}, csvFile.name + " was already used on previous successful import");
					callback({ err, error_row_count: 0, error_details: [] }, null);
				}else{
					//get plans
					new Promise((resolve, reject) => {
						getPlans().then(results => {
								plans = results.map(p => { return p.amount+"" });
								resolve(plans);
							}).catch(error => {
								const err = new errors.InternalError({
									statusCode: 500
								}, "Something went wrong when fetching list of plans");
								reject({ err, error_row_count: 0, error_details: [] });
							});
					}).then(results => {
						//read csv file
						new Promise((resolve, reject) => {
							const validEmailFormat = /^(([^<>()\[\]\\.,;:\s@�+"]+(\.[^<>()\[\]\\.,;:\s@�+"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
							let rowCountWithErrors = 0;
							const users = [];
							const plans = results;
							const emails = [];
							const rowNumbers = [];
							const today = new Date();
							today.setDate(today.getDate() + 1);
							today.setHours(0);
							today.setMinutes(0);
							today.setSeconds(0);
							today.setMilliseconds(0);

							fs.readFile(csvFile.path, async (err, data) => {
								if(err){
									console.log(err);
									return;
								}
								const rows = await neatCsv(data);
								if(rows.length){
									const headers = Object.keys(rows[0]);

									hasCorrectFields(cleanHeaders(headers)).then(valid => {
										if(!valid){
											const err = new errors.PreconditionFailedError({
												statusCode: 412, error_logs: [],
											}, "Expected columns not found in the CSV File");
											reject({ err, error_row_count: 0, error_details: [] });
										} else {
											const validateRows = rows.map(async (row) => {
												if(!row.row_number 
													&& !row.date_purchased
													&& !row.username
													&& !row.plan_purchased
													&& !row.name
													&& !row.birthdate
													&& !row.contact_number
													&& !row.pando_email){
													console.log("Ignore row");
												} else {

													let rowHasErrors = false;
													row.error_details = [];

													row.email = row.pando_email;
													
													//for admin panel table display
													row.date_purchased_str = row.date_purchased;
													row.birthdate_str = row.birthdate;
													row._id = row.row_number;

													if(row.row_number){
														row.row_number = parseInt(row.row_number);
														if(rowNumbers.includes(row.row_number)){
															const msg = "Duplicate Row Number.";
															rowHasErrors = true;
															row.error_details.push(msg);
														}
														rowNumbers.push(row.row_number);
													} else {
														const msg = "No value for row number.";
														rowHasErrors = true;
														row.error_details.push(msg);
													}

													//check fields validity
													if(row.date_purchased){
														await isValidDate(row.date_purchased).then(date => {
															row.date_purchased = date;
														}).catch(error => {
															const msg = "Invalid purchased date value, valid date format should be YYYY/MM/DD or YYYY-MM-DD.";
															rowHasErrors = true;
															row.error_details.push(msg);
														});
													}else{
														const msg = "No value for date purchased.";
														rowHasErrors = true;
														row.error_details.push(msg);
													}

													if(row.username){
														if(row.username.includes('?')){
															const err = new errors.InternalError({
																statusCode: 412
															}, "File is not in CSV UTF-8 (Comma Delimited) format.");
															reject({ err, error_row_count: 0, error_details: [] });
														}
													}

													if(row.name){
														if(row.name.includes('?')){
															const err = new errors.InternalError({
																statusCode: 412
															}, "File is not in CSV UTF-8 (Comma Delimited) format.");
															reject({ err, error_row_count: 0, error_details: [] });
														}
													}

													if(row.email){
														row.email = row.email.toLowerCase();
														row.email = row.email.trim();

														if(emails.includes(row.email)){
															const msg = "Duplicate Email.";
															rowHasErrors = true;
															row.error_details.push(msg);
														}
														emails.push(row.email);

														//check email validity
														if(!validEmailFormat.test(row.email.toLowerCase())){
															const msg = "Invalid Email.";
															rowHasErrors = true;
															row.error_details.push(msg);
														}
													}else{
														const msg = "No value for Email.";
														rowHasErrors = true;
														row.error_details.push(msg);
													}

													if(row.plan_purchased){
														//check valid plan
														try{
															if(!plans.includes(row.plan_purchased)){
																const msg = "Invalid plan amount.";
																rowHasErrors = true;
																row.error_details.push(msg);
															}else{
																const planAmount = parseFloat(row.plan_purchased);
																row.plan_purchased = planAmount;

																if(row.email){
																	await getPlanByUserEmailPromise(row.email)
																		.then(userPlan => {
																			if(userPlan){
																				if(userPlan.plan_amount){
																					if(planAmount < userPlan.plan_amount){
																						const msg = "Plan amount is less than the current plan of the user.";
																						rowHasErrors = true;
																						row.error_details.push(msg);
																					}
																				}

																				//check date purchased here

																			}
																		})
																		.catch(error => {
																			const msg = "Error checking plan amount to existing plan.";
																			rowHasErrors = true;
																			row.error_details.push(msg);
																		});
																}
															}
														}catch(error){
															const msg = "Invalid plan amount.";
															rowHasErrors = true;
															row.error_details.push(msg);
														}
													}else{
														const msg = "No value for plan purchased.";
														rowHasErrors = true;
														row.error_details.push(msg);
													}

													if(row.birthdate){
														await isValidDate(row.birthdate).then(date => {
															row.birthdate = date;

															//further validate date if it is future from today
															try {
																if(row.birthdate.getTime() > today.getTime()){
																	const msg = "Invalid birthday, value is a future date.";
																	rowHasErrors = true;
																	row.error_details.push(msg);
																}
															} catch(error) {
															}
														}).catch(error => {
															const msg = "Invalid birthday value, valid date format should be YYYY/MM/DD or YYYY-MM-DD.";
															rowHasErrors = true;
															row.error_details.push(msg);
														});
													}

													if(rowHasErrors){
														rowCountWithErrors += 1;
													}

													users.push(row);
												}
											});
					
											Promise.all(validateRows).then(() => {
												//sort by row number
												users.sort(function(a, b){
													if(a.row_number < b.row_number){
														return -1;
													} else if(a.row_number > b.row_number){
														return 1;
													} else {
														return 0;
													}
												});
												
												if(rowCountWithErrors > 0){
													const err  = new errors.PreconditionFailedError({
														statusCode: 412,
													}, "Invalid values were found in the CSV file");
													reject({ err, error_row_count: rowCountWithErrors, error_details: users });
												} else {
													resolve(users);
												}
											})
										}
									});
								} else {
									const err = new errors.PreconditionFailedError({
										statusCode: 412, error_logs: [],
									}, "CSV File have no data");
									reject({ err, error_row_count: 0, error_details: [] });
								}
							});
						})
						.then(users => {
							callback(null, users);
						})
						.catch(error => {
							callback(error, null);
						});
					}).catch(error => {
						callback(error, null);
					});
				}
			})
			.catch(error => {
				const err = new errors.InternalError({
					statusCode: 500
				}, "Error while checking if csv file was already used in previous imports");
				callback(err, null);
			});
	}
}

const cleanHeaders = function(headers) {
	return headers.map(h => {
		var output = "";
	    for (var i=0; i<h.length; i++) {
	        if (h.charCodeAt(i) <= 127) {
	            output += h.charAt(i);
	        }
	    }
	    return output;
	});
}

const hasCorrectFields = function(headers) {
	return new Promise((resolve, reject) => {
		if(headers.length){
			if(headers[0] !== 'id'){
				resolve(false);
			}
		}
		if(headers.includes('row_number')
			&& headers.includes('date_purchased')
			//&& headers.includes('username')
			&& headers.includes('plan_purchased')
			//&& headers.includes('name')
			//&& headers.includes('birthdate')
			//&& headers.includes('contact_number')
			&& headers.includes('pando_email')){
			resolve(true);
		} else {
			resolve(false);
		}
	});
}

const isValidDate = function(dateStr) {
	return new Promise((resolve, reject) => {
		if(dateStr.includes('-')){
			dateStr = dateStr.replace('-', '/');
			dateStr = dateStr.replace('-', '/');
		}

		const dateStrArr = dateStr.split('/');
		if(dateStrArr.length === 3){ //valid date
			try {
				const y = parseInt(dateStrArr[0]);
				const m = parseInt(dateStrArr[1] - 1);
				let d = parseInt(dateStrArr[2]);

				if((d >= 1 && d <= 31)
					&& (m >= 0 && m <= 11)){
					//const date = new Date(y, m, d);
					const date = new Date();
					date.setFullYear(y);
					date.setMonth(m);

					if(date.getHours() >= 16) {
						d = d - 1;
					}
					date.setDate(d);
					
					resolve(date);
				} else {
					reject();
				}
			} catch (error) {
				reject(error);
			}
		} else {
			reject();
		}
	});
}

module.exports = { checkImportFile, saveUsers, saltAndHash }