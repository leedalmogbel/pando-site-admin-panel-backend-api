const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;
const usersSchema = new Schema({
    full_name: {
        type: String,
    },
    email_id: {
        type: String,
        required: true,
        index: true,
    },
    country: {
        type: String,
    },
    password: {
        type: String,
    },
    reset_password_token: {
        type: String,
    },
    reset_password_expires: {
        type: String,
    },
    referral_code: {
        type: String,
    },
    referral_by: {
        type: String,
    },
    ethereum_wallet: {
        type: String,
    },
    pando_wallet: {
        type: String,
    },
    verify_token: {
        type: String,
    },
    device_id: {
        type: String,
    },
    activated: {
        type: Boolean,
        default: true,
    },
    is_deleted: {
        type: Number,
        default: 0
    },
    username: {
        type: String,
    },
    birthdate: {
        type: Date,
    },
    contact_number: {
        type: String,
    },
    total_elapsed_time: {
        type: Number
    },
    runtime_earning: {
        type: Number,
    },
    referral_earning: {
        type: Number
    },
    passive_earning: {
        type: Number
    },
    total_withdrawn: {
        type: Number
    },
    balance: {
        type: Number
    },
    reserved_amount: {
        type: Number
    }
});

usersSchema.set("timestamps", true);
usersSchema.plugin(uniqueValidator);
usersSchema.set("toJSON", {
    virtuals: true,
});

const Users = mongoose.model("Users", usersSchema);
module.exports = Users;