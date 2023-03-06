const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const plansSchema = new Schema({
    membership_name: {
        type: String,
    },
    amount: {
        type: Number,
    },
    logo_name: {
        type: String,
    },
    booster_rate: {
        type: Number,
    },
    passive_mining_rate: {
        type: Number,
    }
});

plansSchema.set('timestamps', true);
plansSchema.plugin(uniqueValidator);
plansSchema.set('toJSON', {
    virtuals: true,
});

const Plans = mongoose.model('Plans', plansSchema);
module.exports = Plans;