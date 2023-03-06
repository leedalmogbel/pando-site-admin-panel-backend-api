const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const usersElapsedSchema = new Schema({
    user_id: {
        type: String,
        required: true,
        index: true
    },
    elapsed_time: {
        type: Number,
        required: true,
    },
    mining_rate: {
        type: Number, 
        required: true,
    },
    elapsed_pando_earned: {
        type: Number,
        default:0
    },
    ref_user_id: {
        type: String,
        index: true
    },
    ref_rate: {
        type: Number,
        default: 0
    },
    referral_pando_earned: {
        type: Number,
        default:0
    },
    booster_rate: {
        type: Number,
        default: 0,
    },
    booster_elapsed_pando_earned: {
        type: Number,
        default: 0
    },
});

usersElapsedSchema.set('timestamps', true);
usersElapsedSchema.plugin(uniqueValidator);
usersElapsedSchema.set('toJSON', {
    virtuals: true,
});

const UsersElapsedTime = mongoose.model('UsersElapsedTime', usersElapsedSchema);
module.exports = UsersElapsedTime;