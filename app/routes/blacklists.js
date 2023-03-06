const API_BASE_PATH = "/blacklist";
const API_VERSION = "1.0.0";

const { adminUserCheck, superAdminUserCheck } = require('../common/auth-middlewares');
const { getAllBlacklistedEmails, getBlacklistedEmails, deleteEmailFromBlacklist, addEmailsToBlacklist, addEmailToBlackList, parseCsvFile } = require('./modules/blacklist-manager');

const multer = require('multer');
const upload = multer();

module.exports = function(server) {
	server.get({
		path: API_BASE_PATH + '/all',
		version: API_VERSION
	}, adminUserCheck, _getAllBlacklistedEmails);

	server.post({
		path: API_BASE_PATH,
		version: API_VERSION
	}, adminUserCheck, _addEmailToBlacklist);

	server.post({
		path: API_BASE_PATH + '/force-add',
		version: API_VERSION
	}, adminUserCheck, _forceAddEmailToBlacklist);

	server.post({
		path: API_BASE_PATH + '/batch',
		version: API_VERSION
	}, adminUserCheck, _addEmailsToBlacklist);

	server.get({
		path: API_BASE_PATH,
		version: API_VERSION
	}, adminUserCheck, _getBlacklistedEmails);

	server.del({
		path: API_BASE_PATH + '/:id',
		version: API_VERSION
	}, adminUserCheck, _deleteEmailFromBlacklist);

	server.post({
		path: API_BASE_PATH + '/parse-csv',
		version: API_VERSION
	}, adminUserCheck, upload.single('csvFile'), _parseCsvFile);

	function _parseCsvFile(req, res, next) {
		parseCsvFile(req, (error, result) => {
			if(error) {
				res.send(error.code, { error: error.message });
				return next();
			} else {
				res.send(result);
				return next();
			}
		});
	}

	function _addEmailToBlacklist(req, res, next) {
		addEmailToBlackList(req, false, (error, result) => {
			if(error) {
				res.send(error.code, { error: error.message });
				return next();
			} else {
				res.send({ message: 'success'});
				return next();
			}
		});
	}

	function _forceAddEmailToBlacklist(req, res, next) {
		addEmailToBlackList(req, true, (error, result) => {
			if(error) {
				res.send(error.code, { error: error.message });
				return next();
			} else {
				res.send({ message: 'success'});
				return next();
			}
		});
	}

	function _addEmailsToBlacklist(req, res, next) {
		const addRegistered = true;
		let isAddRegistered = req.body ? (req.body.add_registered) : addRegistered;
		if(isAddRegistered == null) isAddRegistered = false;

		addEmailsToBlacklist(req, isAddRegistered, (error, result) => {
			if(error) {
				res.send(error.code, { error: error.message });
				return next();
			} else {
				res.send({ message: 'success'});
				return next();
			}
		});
	}

	function _deleteEmailFromBlacklist(req, res, next) {
		deleteEmailFromBlacklist(req, (error, result) => {
			if(error) {
				res.send(error.code, { error: error.message });
				return next();
			} else {
				res.send({ message: 'success'});
				return next();
			}
		});
	}

	function _getAllBlacklistedEmails(req, res, next) {
		getAllBlacklistedEmails((error, emails) => {
			if(error) {
				res.send(error.code, { error: error.message });
				return next();
			} else {
				res.send({ emails });
				return next();
			}
		});
	}

	function _getBlacklistedEmails(req, res, next) {
		getBlacklistedEmails(req, (error, result) => {
			if(error) {
				res.send(error.code, { error: error.message });
				return next();
			} else {
				res.send(result);
				return next();
			}
		});
	}
}