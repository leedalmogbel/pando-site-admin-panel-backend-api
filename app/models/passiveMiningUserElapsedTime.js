const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const Schema = mongoose.Schema;

const passiveMiningUserElapsedTime = new Schema({
    user_id: {
        type: String,
        required: true,
        index: true
    },
    mining_rate: {
        type: Number, 
        required: true,
    },
    elapsed_time: {
        type: Number,
        required: true,
    },
    elapsed_pando_earned: {
        type: Number,
        default: 0
    },
    elapsed_datetime: {
        type: Date
    },
    elapsed_datetime_end: {
        type: Date
    },
    usersplans_id : {
        type: String,
    }
});

passiveMiningUserElapsedTime.set('timestamps', true);
passiveMiningUserElapsedTime.plugin(uniqueValidator);
passiveMiningUserElapsedTime.set('toJSON', {
    virtuals: true,
});

const  PassiveMiningUserElapsedTimes = mongoose.model('PassiveMiningUserElapsedTimes', passiveMiningUserElapsedTime);

module.exports = PassiveMiningUserElapsedTimes;