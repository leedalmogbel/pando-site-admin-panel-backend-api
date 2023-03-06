const mongoose = require("mongoose");
const Logs = mongoose.model("Logs");

const saveLog = function(uploadLog) {
	return new Promise((resolve, reject) => {
		uploadLog.save()
			.then(result => {
				resolve(result)
			})
			.catch(error => {
				reject(error);
			});
	});
}

const getLogs = function(req) {
	const offset = parseInt(req.query.offset) || 0;
	const limit = parseInt(req.query.limit) || 10;

	const filename = req.query.filename || '';

	const query = {};

	if(filename) {
		query.uploaded_file_name = { $regex: '.*' + filename + '.*', $options: 'i' };
	}

	return new Promise((resolve, reject) => {
		Logs.countDocuments(query)
			.then(count => {
				Logs.find(query)
					.sort({ _id: -1 })
					.limit(limit)
					.skip(offset)
					.then(logs => {
						resolve({
							total_rows: count,
							logs: logs
						});
					})
					.catch(error => {
						reject(error);
					});
			})
			.catch(error => {
				reject(error);
			});
	});
}

const checkFileNameIfExists = function(fileName) {
	return new Promise((resolve, reject) => {
		Logs.findOne({ uploaded_file_name: fileName, log_type: 'save-users-plans-to-database' })
			.then(log => {
				resolve(log);
			})
			.catch(error => {
				reject(error);
			});
	});
}

module.exports = { saveLog, getLogs, checkFileNameIfExists }