const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const usersPlansSchema = new Schema({
    user_id: {
        type: String,
        required: true,
        index: true
    },
    purchased_date: {
        type: Date,
    },
    purchased_plan_id: {
        type: String,
        index: true
    }
});

usersPlansSchema.set('timestamps', true);
usersPlansSchema.plugin(uniqueValidator);
usersPlansSchema.set('toJSON', {
    virtuals: true,
});

const UsersPlans = mongoose.model('UsersPlans', usersPlansSchema);
module.exports = UsersPlans;