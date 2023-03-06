const readline = require('readline');
const { Writable } = require('stream');

const hash = require('object-hash');
const uuid = require('uuid');
const axios = require('axios');

let mute = false;
const mutableStdout = new Writable({
	write: (chunk, encoding, callback) => {
		if(!mute) {
			process.stdout.write(chunk, encoding);
		}
		callback();
	}
});

const rl = readline.createInterface({
	input: process.stdin,
	output: mutableStdout,
	terminal: true
});

const apiUrls = [
	{
		pandoApi: 'http://localhost:3000/settings/secret',
		adminPanelApi: 'http://localhost:4000/settings/secret',
		cryptoApi: 'http://149.56.44.95:3003/setscretkey'
	},
	{ 
		pandoApi: 'https://pandoapi-sat.pandobrowser.com/settings/secret',
		adminPanelApi: 'https://admin-panel-api-sat.pandobrowser.com/settings/secret',
		cryptoApi: 'http://149.56.44.95:3003/setscretkey'
	},
	{ 
		pandoApi: 'https://pandoapi-staging.pandobrowser.com/settings/secret',
		adminPanelApi: 'https://admin-panel-api-dev.pandobrowser.com/settings/secret',
		cryptoApi: 'http://localhost:3003/setscretkey'
	},
	{ 
		pandoApi: 'http://localhost:9000/settings/secret',
		adminPanelApi: 'http://localhost:8000/settings/secret',
		cryptoApi: 'http://localhost:3003/setscretkey'
	},
];

function askEnvironment(){
	rl.question('Environment (0 - DEV / 1 - SAT / 2 - UAT / 3 - PROD): ', (envi) => {
		if(envi == 0 || envi == '1' || envi == '2' || envi == '3'){
			const enviValue = parseInt(envi);
			
			const pandoApi = apiUrls[enviValue].pandoApi;
			const adminPanelApi = apiUrls[enviValue].adminPanelApi;
			const cryptoApi = apiUrls[enviValue].cryptoApi;

			//generate key pair
			const key = hash({ enviValue, date: new Date(), randomValue: Math.random(), uuid: uuid.v4() });
			const salt = hash({ enviValue, date: new Date(), randomValue:  Math.random(), uuid: uuid.v4() });

			//send key pair
			const pandoApiRequest = axios.post(pandoApi, { password: key, salt: salt });
			const adminPanelApiRequest = axios.post(adminPanelApi, { password: key, salt: salt });
			const cryptoApiRequest = axios.post(cryptoApi, { password: key, salt: salt });

			axios.all([pandoApiRequest, adminPanelApiRequest, cryptoApiRequest])
				.then(result => {
					console.log(`Password - ${key} / Salt - ${salt}`);
					console.log('Generated Key Pair sent to API servers');
					process.exit();
				})
				.catch(error => {
					console.log(error);
					process.exit();
				});
		} else {
			askEnvironment();
		}
	});
}

askEnvironment();