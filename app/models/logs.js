const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const logsSchema = new Schema({
    uploaded_file_name: {
        type: String
    },
    log_type: {
        type: String
    },
    log_details: {
        type: String
    },
    created_by: {
        type: String
    }
});

logsSchema.set('timestamps', true);
logsSchema.plugin(uniqueValidator);
logsSchema.set('toJSON', {
    virtuals: true,
});

const Logs = mongoose.model('Logs', logsSchema);
module.exports = Logs;