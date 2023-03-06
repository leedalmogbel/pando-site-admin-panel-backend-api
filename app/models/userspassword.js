const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const usersPasswordSchema = new Schema({
    user_id: {
        type: String,
        required: true,
        index: true
    },
    user_password: {
        type: String,
        required: true
    },
    salt: {
        type: String,
        required: true
    },
});
usersPasswordSchema.set('timestamps', true);
usersPasswordSchema.plugin(uniqueValidator);
usersPasswordSchema.set('toJSON', {
    virtuals: true,
});

const UsersPassword = mongoose.model('UsersPassword', usersPasswordSchema);

module.exports = UsersPassword;