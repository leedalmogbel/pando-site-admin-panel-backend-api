const { validateLogin, forgetPassword, resetPassword, isAdminUser } = require("./modules/admin-user-manager");

const API_BASE_PATH = "/adminUsers";
const API_VERSION = "1.0.0";

module.exports = function(server) {
	server.post({
		path: API_BASE_PATH + "/login",
		version: API_VERSION
	}, login);

	server.post({
		path: API_BASE_PATH + "/forgetPasswordWeb",
		version: API_VERSION
	}, _forgetPassword);

	server.post({
		path: API_BASE_PATH + "/resetPasswordWeb",
		version: API_VERSION
	}, _resetPassword);

	server.post({
		path: API_BASE_PATH + "/verifyToken",
		version: API_VERSION
	}, verifyToken);

	function verifyToken(req, res, next){
		session.load(req.header("session-id"), function(err, data) {
			if(data) {
				isAdminUser(data.email_id, (error, isAdminUserFlag) => {
					if(isAdminUserFlag && data.isAdminPanel) {
						res.send(200, { msg: "Session is valid." });
						return next();
					} else {
						res.send(401, { error: "Session has already expired, please login again." });
						return next();
					}
				});
			} else {
				res.send(401, { error: "Session has already expired, please login again." });
				return next();
			}
		});
	}

	function login(req, res, next) {
		validateLogin(req, function(err, result){
			if(err) {
				res.send(err.statusCode, { error: err.body.message });
				return next(err);
			} else {
				const sessionObj = {};
				sessionObj.email_id = result.email_id;
				sessionObj.user_id = result._id;
				sessionObj.role = result.role;
				sessionObj.isAdminPanel = true;
				session.save(req.session.sid, sessionObj, function (err, status) {
					if(err) {
						log.error("Session data cannot be saved");
						return next(err);
					}
				});

				const user = result._doc;
				delete user.password;

				res.send(200, { user, token: req.session.sid });
				return next();
			}
		});
	}

	function _forgetPassword(req, res, next) {
		forgetPassword(req, function(err, result){
			if(err) {
				res.send(err.statusCode, { error: err.body.message });
				return next(err);
			} else {
				if(!req.header("session-id")) {
					const resultObj = {};
					resultObj.email_id = result.email_id;
					resultObj.user_id = result._id;
					session.save(req.session.sid, resultObj, function(err, status) {
						if(err) {
							log.error("Session data cannot be saved");
							return next(err);
						}
					});
				}
				res.send(200, { msg: "Success" });
				return next();
			}
		});
	}

	function _resetPassword(req, res, next) {
		resetPassword(req, function(err, result){
			if(err) {
				res.send(err.statusCode, { error: err.body.message });
				return next(err);
			} else {
				if(!req.header("session-id")) {
					const resultObj = {};
					resultObj.email_id = result.email_id;
					resultObj.user_id = result._id;
					session.save(req.session.sid, resultObj, function(err, status) {
						if(err) {
							log.error("Session data cannot be saved");
							return next(err);
						}
					});
				}
				res.send(200, { msg: "Success" });
				return next();
			}
		});
	}
};