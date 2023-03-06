const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const errors = require("restify-errors");
const crypto = require("crypto");
const fs = require('fs');

const AdminUsers = mongoose.model("AdminUsers");
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

const validateLogin = function(req, callback) {
	if(req.body.username == null || req.body.password == null){
		const err = new errors.MissingParameterError({
			statusCode: 409
		}, "Invalid JSON Body");
		callback(err, null);
		return;
	}
	AdminUsers.findOne({ email_id: req.body.username.toLowerCase() })
		.then(adminUser => {
			adminUser.comparePassword(req.body.password, function(err, isMatch){
				if(err){
					const myErr = new errors.InternalError({
						statusCode: 500
					}, "Error on hashing the password");
					callback(myErr, null);
					return;
				}
				if(isMatch){
					callback(null, adminUser);
					return;
				} else {
					const myErr = new errors.InvalidCredentialsError({
						statusCode: 401
					}, "Invalid Password");
					callback(myErr, null);
					return;
				}
			});
		})
		.catch(error => {
			const err = new errors.InvalidCredentialsError({
				statusCode: 401
			}, "Invalid E-mail");
			callback(err, null);
			return;
		});
}

const forgetPassword = function(req, callback) {
	if(req.body.email_id == null){
		const err = new errors.MissingParameterError({
			statusCode: 409
		}, "Invalid JSON Body");
		callback(err, null);
		return;
	}
	AdminUsers.findOne({ email_id: req.body.email_id.toLowerCase() })
		.then(adminUser => {
			const token = crypto.randomBytes(16).toString("hex");
			adminUser.reset_password_token = token;
			adminUser.reset_password_expires = Date.now() + 3600000;

			adminUser.save()
				.then(result => {
					//send reset passwor link to email here
					const mailTemplate = './templates/reset-password-email.html';
					fs.readFile(mailTemplate, "utf8", function (error, data) {
                        if(error){
                        	console.log("Error reading email template file");
                        }else{
                        	const mailOptions = {
								from: "info@pandobrowser.com",
								to: adminUser.email_id,
								subject: "Admin Panel - Reset Password",
								html: data.replace('{{link}}', `${config.adminPanelUrl}/reset-password?token=${token}`)
										.replace('{{link_english}}', `${config.adminPanelUrl}/reset-password?token=${token}`)
							}

							transporter.sendMail(mailOptions, function(error, info) {
								if(error){
									const err = new errors.InternalError({
										statusCode: 500
									}, "Error while sending the mail");
									callback(err, null);
									return;
								}else{
									console.log(`Email sent to ${adminUser.email_id}: ${info.response}`);
									callback(null, adminUser);
									return;
								}
							});
                        }
                    });
				})
				.catch(error => {
					const err = new errors.InternalError({
						statusCode: 500
					}, "Error while saving generated token to the user");
					callback(err, null);
					return;
				});
		})
		.catch(error => {
			const err = new errors.InvalidContentError({
				statusCode: 400
			}, "E-mail does not exist");
			callback(err, null);
			return;
		});
}

const resetPassword = function(req, callback) {
	if(req.body.token == null || req.body.new_password == null){
		const err = new errors.MissingParameterError({
			statusCode: 409
		}, "Invalid JSON Body");
		callback(err, null);
		return;
	}
	AdminUsers.findOne({ reset_password_token: req.body.token })
		.then(adminUser => {
			const expiry = parseFloat(adminUser.reset_password_expires);
			if(parseFloat(Date.now()) > expiry) { //expired token
				const err = new errors.InvalidContentError({
					statusCode: 400
				}, "Token has already expired");
				callback(err, null);
				return;
			} else { //valid unexpired token
				adminUser.password = req.body.new_password;
				adminUser.save()
					.then(adminUser => {
						callback(null, adminUser);
						return;
					})
					.catch(error => {
						const err = new errors.InternalError({
							statusCode: 500
						}, "Error while saving new password");
						callback(err, null);
						return;
					});
			}
		})
		.catch(error => {
			const err = new errors.InvalidContentError({
				statusCode: 400
			}, "Invalid Token");
			callback(err, null);
			return;
		});
}

const isAdminUser = (email, callback) => {
	AdminUsers.findOne({ email_id: email }, (error, adminUser) => {
		if(adminUser) {
			callback(null, true);
		} else {
			callback(null, false)
		}
	});
}

module.exports = { validateLogin, forgetPassword, resetPassword, isAdminUser }