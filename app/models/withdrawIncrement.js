const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const withdrawaIncrementSchema = new Schema({
    amount: {
        type: Number
    },
    user: {
        type: String
    }
});

withdrawaIncrementSchema.set('timestamps', true);
withdrawaIncrementSchema.plugin(uniqueValidator);
withdrawaIncrementSchema.set('toJSON', {
    virtuals: true,
});

const WithdrawIncrement = mongoose.model('WithdrawIncrement', withdrawaIncrementSchema);
module.exports = WithdrawIncrement;