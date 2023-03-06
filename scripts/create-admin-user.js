const readline = require('readline');
const { Writable } = require('stream');

const AdminUsers = require('../app/models/adminUsers');
const dbConnection = require('./scripts-db-connection');

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

const user = {
}

function createUser() {
	const adminUser = new AdminUsers(user);
	adminUser.save()
		.then(result => {
			console.log('User created!');
			process.exit();
		})
		.catch(error => {
			console.log('Error while creating user: '+error);
			process.exit();
		});
}

function askFullName() {
	rl.question('Full Name: ', fullname => {
		user.full_name = fullname;
		askEmailId();
	});
}

function askEmailId() {
	rl.question('Email: ', email => {
		user.email_id = email;
		askRole();
	});
}

function askRole(){
	rl.question('Role (Admin): ', role => {
		if(role) {
			if(role === 'Super Admin'){
				user.role = role;
				askPassword();
			} else if(role === 'Admin'){
				user.role = role;
				askPassword();
			} else {
				console.log('Invalid Role');
				askRole();
			}
		} else {
			user.role = 'Admin';
			askPassword();
		}
	});
}

function askPassword() {
	rl.question('Password: ', password => {
		user.password = password;
		createUser();
		rl.close();
	});
}

dbConnection().then(() => {
	askFullName();
}).catch(error => { console.log('Something went wrong!') });