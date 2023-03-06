const { isAdminUser } = require('../routes/modules/admin-user-manager');
const { userRoles } = require('./constants');
const config = require("../../config/config");

const adminUserCheck = (req, res, next) => {
	session.load(req.header("session-id"), function(err, data) {
		if(data) {
			isAdminUser(data.email_id, (error, isAdminUserFlag) => {
				if(isAdminUserFlag && data.isAdminPanel) {
					return next();
				} else {
					res.send(401, { error: "Unauthorized Request" });
					return next(false);
				}
			});
		} else {
			res.send(401, { error: "Unauthorized Access" });
			return next(false);
		}
	});
}

const superAdminUserCheck = (req, res, next) => {
	session.load(req.header("session-id"), function(err, data) {
		if(data) {
			isAdminUser(data.email_id, (error, isAdminUserFlag) => {
				if(isAdminUserFlag && data.isAdminPanel) {
					if(data.role == userRoles.SUPER_ADMIN && data.email_id == config.superAdminEmailAddress){
						return next();
					} else {
						res.send(401, { error: "Unauthorized Request" });
						return next(false);
					}
				} else {
					res.send(401, { error: "Unauthorized Request" });
					return next(false);
				}
			});
		} else {
			res.send(401, { error: "Unauthorized Access" });
			return next(false);
		}
	});
}

module.exports = {
	adminUserCheck,
	superAdminUserCheck
}