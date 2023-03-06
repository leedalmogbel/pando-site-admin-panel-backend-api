const mongoose = require('mongoose');
const BlackList = mongoose.model('BlackList');
const Users = mongoose.model('Users');

const UpdateLogs = mongoose.model("UpdateLogs");
const { saveLog } = require('./update-logs-manager');

const fs = require('fs');
const neatCsv = require('neat-csv');

const getAllBlacklistedEmails = (callback) => {
	BlackList.find({}, 'email_id')
		.sort({ email_id: 1 })
		.exec((error, emails) => {
			if(error) {
				callback({
					code: 500,
					message: 'Error fetching list of blacklisted emails'
				}, null);
			} else {
				callback(null, emails);
			}
		});
}

const getBlacklistedEmails = (req, callback) => {
	const offset = parseInt(req.query.offset) || 0;
	const limit = parseInt(req.query.limit) || 10;

	const query = {};

	const email = req.query.email || '';

	if(email) {
		query.email_id = { $regex: '.*' + email + '.*', $options: 'i' };
	}

	UpdateLogs.findOne({ log_model: 'blacklist' })
		.sort({ createdAt: -1 })
		.exec((error, lastUpdateRow) => {
			if(error) {
				callback({
					code: 500,
					message: 'Error fetching list of blacklisted emails'
				}, null);
				return;
			}

			let last_updated = null;

			if(lastUpdateRow) {
				last_updated = lastUpdateRow.createdAt;
			}

			BlackList.countDocuments(query, (error, count) => {
				BlackList.find(query, 'email_id createdAt')
					.sort({ _id: -1 })
					.limit(limit)
					.skip(offset)
					.exec((error, emails) => {
						if(error) {
							callback({
								code: 500,
								message: 'Error fetching list of blacklisted emails'
							}, null);
						} else {
							if(!last_updated){
								last_updated = emails[0] ? emails[0].createdAt : null;
							}

							callback(null, { total_rows: count, last_updated, emails });
						}
					});
			});
		});
}

const deleteEmailFromBlacklist = (req, callback) => {
	const id = req.params.id || '';
	BlackList.findOne({ _id: id }, (error, email) => {
		if(error) {
			callback({
				code: 500,
				message: 'Error removing email from blacklist'
			}, null);
			return;
		}

		if(email) {
			BlackList.deleteOne({ _id: id }, (error, result) => {
				if(error) {
					callback({
						code: 500,
						message: 'Error removing email from blacklist'
					}, null);
				} else {
					const updateLog = new UpdateLogs({
						log_model: 'blacklist',
						log_details: JSON.stringify({ action: 'delete', email: email.email_id }),
						created_by: req.session.email_id
					});
					saveLog(updateLog);
					callback(null, true);
				}
			});
		} else {
			callback({
				code: 500,
				message: 'Error removing email from blacklist'
			}, null);
			return;
		}
	});
}

const addEmailToBlackList = (req, forceAdd, callback) => {
	const email = req.body.email || '';

	if(email) {
		BlackList.findOne({ email_id: email.toLowerCase() }, (error, result) => {
			if(error) {
				callback({
					code: 400,
					message: 'Error checking email if duplicate'
				}, null);
				return;
			}

			if(result) {
				callback({
					code: 400,
					message: 'Email already blacklisted'
				}, null);
				return;
			}

			Users.findOne({ email_id: email.toLowerCase(), is_deleted: 0 }, (error, user) => {
				if(error) {
					callback({
						code: 400,
						message: 'Error checking email if registered'
					}, null);
					return;
				}

				if(user) {
					if(forceAdd) {
						addEmailToDb(email, req.session.email_id, (error, result) => {
							if(error) {
								callback({
									code: 400,
									message: 'Error adding email to blacklist'
								}, null);
								return;
							}
							callback(null, true);
						});
					} else {
						callback({
							code: 400,
							message: 'Email is currently registered'
						}, null);
						return;
					}
				} else {
					addEmailToDb(email, req.session.email_id, (error, result) => {
						if(error) {
							callback({
								code: 400,
								message: 'Error adding email to blacklist'
							}, null);
							return;
						}
						callback(null, true);
					});
				}
			});
		});
	} else {
		callback({
			code: 400,
			message: 'Invalid request'
		}, null);
	}
}

const addEmailToDb = (email, adminUser, callback) => {
	const blacklistEmail = new BlackList({ email_id: email.toLowerCase() });
	blacklistEmail.save().then((result) => {
		log.info(`${email} added to blacklist`);

		const updateLog = new UpdateLogs({
			log_model: 'blacklist',
			log_details: JSON.stringify({ action: 'add', email: [ email ] }),
			created_by: adminUser
		});
		saveLog(updateLog);

		callback(null, true);
	}).catch(error => {
		log.error(`Error adding email to blacklist - ${email}`);
		callback(true, null);
	});
}

const addEmailsToBlacklist = (req, addRegistered, callback) => {
	const emails = req.body.emails || [];
	const emailsBlacklisted = [];
	
	const processEmails = emails.map(async (item) => {
		if(item.valid && addRegistered){
			if(item.email) {
				let blacklistEmail = new BlackList({ email_id: item.email.toLowerCase() });
				await blacklistEmail.save().then((result) => {
					log.info(`${item.email} added to blacklist`);
					emailsBlacklisted.push(item.email);
				}).catch(error => {
					log.error('Error adding email to blacklist');
				});
			}
		}
	});

	Promise.all(processEmails).then(() => {
		const updateLog = new UpdateLogs({
			log_model: 'blacklist',
			log_details: JSON.stringify({ action: 'add', email: emailsBlacklisted }),
			created_by: req.session.email_id
		});
		saveLog(updateLog);

		callback(null, emailsBlacklisted);
	});
}

const parseCsvFile = (req, callback) => {
	const csvFile = req.files.csvFile;

	if(!csvFile) {
		callback({
			code: 400,
			message: 'Invalid request'
		}, null);
		return;
	}

	fs.readFile(csvFile.path, async (error, data) => {
		if(error) {
			callback({
				code: 500,
				message: 'Error reading file content'
			}, null);
			return;
		}

		const rows = await neatCsv(data);

		if(!rows.length) {
			callback({ code: 400, message: 'CSV file no content' }, null);
			return;
		}

		const headers = Object.keys(rows[0]);
		if(!headers.includes('EMAIL')) {
			callback({ code: 400, message: 'Expected columns not found in the CSV File' }, null);
			return;
		}

		const items = [];
		const emails = [];
		let rowNum = 1;
		const validEmailFormat = /^(([^<>()\[\]\\.,;:\s@�+"]+(\.[^<>()\[\]\\.,;:\s@�+"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

		const processData = rows.map(async (item) => {
			const email = item.EMAIL ? item.EMAIL.trim().toLowerCase() : '';

			if(email) {
				const obj = {
					_id: rowNum,
					rowNum,
					email,
					valid: true,
					remarks: [],
					registered: false
				};
				rowNum += 1;

				//check email validity
				if(!validEmailFormat.test(email) 
					|| email.includes('@-')
					|| email.includes('-@')
					|| email.includes('"')
					|| email.includes('\'')){
					obj.valid = false;
					obj.remarks.push('Invalid Format');
				}

				if(emails.includes(email)) {
					obj.valid = false;
					obj.remarks.push('Duplicate');
				} else {
					emails.push(email);
				}

				await BlackList.findOne({ email_id: email })
					.then(result => {
						if(result) {
							obj.valid = false;
							if(!obj.remarks.includes('Duplicate')) obj.remarks.push('Duplicate');
						}
					})
					.catch(error => {
						log.error(`Error checking ${email} - if duplicate`);
					});

				if(obj.valid) {
					await Users.findOne({ email_id: email })
						.then(result => {
							if(result) {
								obj.registered = true;
								obj.remarks.push('Registered');
							}
						})
						.catch(error => {
							log.error(`Error checking ${email} - if already registered`);
						});
				}

				items.push(obj);
			}
		});

		Promise.all(processData).then(() => {
			items.sort((a, b) => {
				if(a.rowNum < b.rowNum) return -1;
				if(a.rowNum > b.rowNum) return 1;
				return 0;
			});

			callback(null, { rows: items });
		});
	});
}

module.exports = {
	getAllBlacklistedEmails,
	getBlacklistedEmails,
	deleteEmailFromBlacklist,
	addEmailsToBlacklist,
	addEmailToBlackList,
	parseCsvFile
}