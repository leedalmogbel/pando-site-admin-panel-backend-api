const bunyan = require('bunyan');
const path = require('path');
const config = require(path.join(__dirname, '/config/config'));

const log = bunyan.createLogger({
    name: config.log.name,
    streams: [{
        level: 'debug',
        stream: process.stdout
    }, {
        level: 'info',
        path: path.join(__dirname, '/logs/server.log'),
        period: '1d',
    }, {
        level: 'error',
        path: path.join(__dirname, '/logs/server.log'),
        period: '2d',
    }, ],
});

module.exports = log;