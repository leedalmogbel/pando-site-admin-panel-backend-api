require('dotenv').config();
const path = require("path");
const rootPath = path.normalize(__dirname + "/..");
const NODE_ENV = process.env.NODE_ENV || "development";
const NODE_HOST = process.env.NODE_HOST || "localhost";
const NODE_PORT = process.env.NODE_PORT || 3000;
const MONGO_HOST = process.env.MONGO_HOST || "localhost";
const MONGO_PORT = process.env.MONGO_PORT || 27017;
const MONGO_USER = process.env.MONGO_USER || "admin";
const MONGO_PASS = process.env.MONGO_PASS || "admin123";
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const SUPER_ADMIN_EMAIL_ADDRESS = "sarah.testemail002@gmail.com";

const APP_NAME = "pandoEngine";

const config = {
	development: {
		env: NODE_ENV,
		root: rootPath,
		adminPanelUrl: "https://admin-panel-dev.pandobrowser.com",
		cryptoApiUrl: "http://localhost:3003",
		pandoApiUrl: "http://localhost:9001",
		app: {
			name: APP_NAME + NODE_ENV,
			address: NODE_HOST,
			port: NODE_PORT,
		},
		db: {
			host: MONGO_HOST,
			port: MONGO_PORT,
			user: MONGO_USER,
			pass: MONGO_PASS,
			name: APP_NAME + NODE_ENV,
		},
		log: {
			name: APP_NAME + NODE_ENV,
			level: LOG_LEVEL,
		},
		openSeaContract: {
			contractAddress: "0x918052e112eea977fd7a8a178cad7200ec1aba7f",
		},
		email:{
            host: "smtp.mandrillapp.com",
			port: 587,
			secure: false,
			auth: {
				user: "Dappatoz",
				pass: "Ej9AeUTONCSos04VXqqIJQ",
			},
        },
        superAdminEmailAddress: SUPER_ADMIN_EMAIL_ADDRESS
	},
	sat: {
		env: NODE_ENV,
		root: rootPath,
		adminPanelUrl: "https://admin-panel-sat.pandobrowser.com",
		cryptoApiUrl: "http://149.56.44.95:3003",
		pandoApiUrl: "http://localhost:7000",
		app: {
			name: APP_NAME + "development",
			address: NODE_HOST,
			port: NODE_PORT,
		},
		db: {
			host: MONGO_HOST,
			port: MONGO_PORT,
			user: MONGO_USER,
			pass: MONGO_PASS,
			name: APP_NAME + "development",
		},
		log: {
			name: APP_NAME + "development",
			level: LOG_LEVEL,
		},
		openSeaContract: {
			contractAddress: "0x918052e112eea977fd7a8a178cad7200ec1aba7f",
		},
		email:{
            host: "smtp.mandrillapp.com",
			port: 587,
			secure: false,
			auth: {
				user: "Dappatoz",
				pass: "Ej9AeUTONCSos04VXqqIJQ",
			},
        },
        superAdminEmailAddress: SUPER_ADMIN_EMAIL_ADDRESS
	},
	production: {
		env: NODE_ENV,
		root: rootPath,
		adminPanelUrl: "https://admin-panel.pandobrowser.com",
		cryptoApiUrl: "http://localhost:3003",
		pandoApiUrl: "http://localhost:9000",
		app: {
			name: APP_NAME + "development",
			address: NODE_HOST,
			port: NODE_PORT,
		},
		db: {
			host: MONGO_HOST,
			port: MONGO_PORT,
			user: MONGO_USER,
			pass: MONGO_PASS,
			name: APP_NAME + "development",
		},
		log: {
			name: APP_NAME + "development",
			level: LOG_LEVEL,
		},
		openSeaContract: {
			contractAddress: "0x918052e112eea977fd7a8a178cad7200ec1aba7f",
		},
		email:{
            host: "smtp.mandrillapp.com",
			port: 587,
			secure: false,
			auth: {
				user: "Dappatoz",
				pass: "Ej9AeUTONCSos04VXqqIJQ",
			},
        },
        superAdminEmailAddress: SUPER_ADMIN_EMAIL_ADDRESS
	},
}

module.exports = config[NODE_ENV];