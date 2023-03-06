const restify = require('restify');
const corsMiddleware = require('restify-cors-middleware')
global.session = require('restify-session')({ debug: true, ttl: 172800 });
const path = require('path');
const config = require(path.join(__dirname, '/config/config'));
global.log = require(path.join(__dirname, '/log'));
const dbConnection = require(path.join(__dirname, '/db-connection'));
const customErrors = require('restify-errors');

global.secret = { password: '', salt: '' };

const models = require(path.join(__dirname, '/app/models/'));
const routes = require(path.join(__dirname, '/app/routes/'));

// CONNECT TO DB
dbConnection();

// INITIALIZE SERVER INSTANCE
const server = restify.createServer({
	name: config.app.name,
	log: log
});

// APPLY MIDDLEWARES
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());
server.use(restify.plugins.gzipResponse());
server.pre(restify.pre.sanitizePath());
server.use(session.sessionManager);

const cors = corsMiddleware({
    preflightMaxAge: 5, //Optional
    origins: ['*'],
    allowHeaders: ['session-id'],
    exposeHeaders: ['session-id-expiry','session-id']
});

server.pre(cors.preflight);
server.use(cors.actual);

server.use(function crossOrigin(req, res, next) {
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    if (req.header('session-id')) {
        session.load(req.header('session-id'), function(err, data) {
            if (!data) {
                var myErr = new customErrors.UnauthorizedError({
                    statusCode: 401
                }, 'UnauthorizedError Invalid session id');
                log.error(myErr);
                return next(myErr);
            } else {
                return next();
            }
        });
    } else {
        return next();
    }
});

server.on('uncaughtException', function(req, res, route, err) {
    log.info('******* Begin Error *******\n%s\n*******\n%s\n******* End Error *******', route, err.stack);
    if (!res.headersSent) {
        return res.send(500, {
            ok: false
        });
    }
    res.write('\n');
    res.end();
});

process.on('uncaughtException', (error) => {
    console.error(error);
});

models();
routes(server);

// for server maintenance mode - implement this on android api
// server.pre(function (req, res, next) {
//     const maintenanceMode = false; //get value from settings collection
//     if(maintenanceMode){
//         if(!res.headersSent){
//             res.send(500, { statusCode: 500, message: "Server is currently on maintenance. Please try again later" });
//         }
//         res.end();
//     }else{
//         return next();
//     }
// });

server.get('/', function(req, res, next) {
    res.send(config.app.name);
    return next();
});

const Utils = require('./app/common/Utils');

server.listen(config.app.port, function() {
    log.info('Application %s listening at %s:%s', config.app.name, config.app.address, config.app.port);
});