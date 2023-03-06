const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const transactionFeeSchema = new Schema({
    range_lower: {
        type: Number
    },
    range_upper: {
        type: Number
    },
    fee: {
        type: Number
    }
});

transactionFeeSchema.set('timestamps', true);
transactionFeeSchema.plugin(uniqueValidator);
transactionFeeSchema.set('toJSON', {
    virtuals: true,
});

const TransactionFee = mongoose.model('TransactionFee', transactionFeeSchema);
module.exports = TransactionFee;