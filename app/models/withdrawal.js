const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const withdrawalSchema = new Schema({
    user_id: {
        type: String,
        required: true,
        index: true
    },
    total_amount: {
        type: Number
    },
    transaction_fee_amount: {
        type: Number
    },
    gas_speed: {
        type: Number
    },
    gas_amount: {
        type: Number
    },
    amount_sent: {
        type: Number
    },
    decenternet_hot_wallet_address: {
        type: String
    },
    pando_hot_wallet_address: {
        type: String,
        index: true
    },
    receiver_address: {
        type: String
    },
    transaction_hash: {
        type: String,
        index: true
    },
    status: {
        type: Number
    },
});

withdrawalSchema.set('timestamps', true);
withdrawalSchema.plugin(uniqueValidator);
withdrawalSchema.set('toJSON', {
    virtuals: true,
});

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);
module.exports = Withdrawal;