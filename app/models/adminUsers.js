const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const bcrypt = require("bcrypt");

const SALT_WORK_FACTOR = 10;

const Schema = mongoose.Schema;

const adminUsersSchema = new Schema({
	full_name: {
		type: String
	},
	email_id: {
		type: String,
		unique: true,
		required: true,
		index: true
	},
	role: {
		type: String,
		default: 'Admin'
	},
	password: {
		type: String,
		required: true
	},
	reset_password_token: {
		type: String
	},
	reset_password_expires: {
		type: String
	}
});

adminUsersSchema.set("timestamps", true);
adminUsersSchema.plugin(uniqueValidator);
adminUsersSchema.set("toJSON", {
	virtuals: true
});

adminUsersSchema.pre("save", function(next) {
	const adminUser = this;

	if(!adminUser.isModified("password")) return next();

	bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
		if(err) return next(err);

		bcrypt.hash(adminUser.password, salt, function(err, hash) {
			if(err) return next(err);

			adminUser.password = hash;
			next();
		});
	});
});

adminUsersSchema.methods.comparePassword = function(password, callback) {
	bcrypt.compare(password, this.password, function(err, isMatch) {
		if(err) return callback(err, false);
		callback(null, isMatch);
	});
};

module.exports = mongoose.model("AdminUsers", adminUsersSchema);