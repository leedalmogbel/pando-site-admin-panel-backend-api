const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const blacklistSchema = new Schema({
    email_id: {
        type: String,
        required: true,
        index: true
    }
});

blacklistSchema.set('timestamps', true);
blacklistSchema.plugin(uniqueValidator);

const BlackList = mongoose.model('BlackList', blacklistSchema);
module.exports = BlackList;