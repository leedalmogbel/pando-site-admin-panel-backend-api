const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const updateLogsSchema = new Schema({
    log_model: {
        type: String,
        index: true
    },
    log_model_field: {
        type: String,
        index: true
    },
    log_details: {
        type: String
    },
    created_by: {
        type: String,
        required: true,
        index: true
    }
});

updateLogsSchema.set('timestamps', true);
updateLogsSchema.plugin(uniqueValidator);
updateLogsSchema.set('toJSON', {
    virtuals: true,
});

const UpdateLogs = mongoose.model('UpdateLogs', updateLogsSchema);
module.exports = UpdateLogs;