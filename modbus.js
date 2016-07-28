'use strict';
const modbus = require('jsmodbus');
const mdns = require('mdns-js');
const faultHandler = require('./faultHandler.js')


const queue = [];

const MODBUS_PORT = 502; // standard port for MODBUS
const FIREPLACE_STATUS_REG = 40203;
const FIREPLACE_ACTION_REG = 40200;
const FAULT_DETAIL_REG = 40204;
const ROOM_TEMPERATURE_REG = 40207;
const COMM_TIMEOUT_REG = 40202;
const RSSI_GATEWAY_REG = 40205;
const RSSI_DFGT_REG = 40206;
const TIMEOUT = 5000;


let unitID = 2,
	connID = 0; // default initial value

let client;
const commandQueue = [];
let currentCommand;
const status = {};

const funcs = {
	setLight,
	setTimeout: setTimeout,
	getLight: getLight,
	getTemp: getTemp,
	getTest: getTest,
	setTest: setTest,
};

// Get IP address using mDNS
console.log('connecting...');


const browser = mdns.createBrowser('_modbus._tcp.local');

browser.on('ready', () => {
	browser.discover();
});

browser.on('update', (data) => {

	console.log('address:', data.addresses[0]);

	const ip = data.addresses[0];
	client = modbus.client.tcp.complete({
		host: ip,
		port: MODBUS_PORT,
		autoReconnect: false,
		// 'reconnectTimeout'	: 1000,
		// 'timeout'			: 5000,
		unitId: unitID,
	});

	client.connect();

	client.once('connect', () => { // once
		console.log('connected');
		checkFault((err,fault)=>{
			console.log(err,fault);
			if(err){ 
				console.log('error in fault checking');
			}
			else if(fault){
				console.log(fault);
			}else if(!fault){
				console.log(`connected to port ${client.port} on ${client.host}, using unitID ${client.unitId}`);
				//nextCommand(); // start running commands
			}
		});
	});

	client.on('error', (err) => {
		console.log(`CONNERR ${err}`);
	});

	client.on('close', () => {
		console.log('closed connection');
	});
});


function reset() {}


// // BEGIN QUEUEING FUNCTIONS ////
function add(commandId, args, callback) {

	var callback = callback || function(){};

	if (typeof args === 'function') {
		cb = args;
	}
	//console.log(client.getState());
	commandQueue.push({
		commandId,
		args,
		callback
	});

	if (client && (client.getState() === 'connected' || client.getState() === 'ready')) {
		nextCommand();
	}
}

function nextCommand() {
	
	if (typeof currentCommand !== 'undefined') return;
	if (commandQueue.length < 1) return;


	currentCommand = commandQueue.shift();

	function cb (err, result){
		currentCommand.callback(err, result);
		currentCommand = undefined;
		nextCommand();
	};

	if (typeof currentCommand.args === 'function' || typeof currentCommand.args === 'undefined') {
		currentCommand.args = cb;
	}

	//console.log(currentCommand.args.toString(), cb.toString());

	funcs[currentCommand.commandId].call(client, currentCommand.args, cb);
}
// // END QUEUEING FUNCTIONS ////


// // BEGIN GETTERS ////
function getLight(callback) {

	client.readHoldingRegisters(FIREPLACE_STATUS_REG, 1).then((resp) => {
		const reg = resp.register[0];

		if (reg & 256) {
			return callback(null, true);
		} else if ((reg & 256) === 0) {
			return callback(null, false);
		}

		console.log('else');
		return callback(new Error('could not get status', null));

	}, (err) => {
		console.log(err);
		return callback(new Error('failed status'), null);
	});
}

function getTemp(callback) {
	client.readHoldingRegisters(ROOM_TEMPERATURE_REG, 1)
		.then((resp) => {
			if (resp.register[0] > 700) return callback(new Error('Error reading register'));
			return callback(null, resp.register[0] / 10);
		}, (fail) =>
			callback(new Error(JSON.stringify(fail)))
		);
}

function getTest(callback) {
	
	client.readHoldingRegisters(40203, 1).then((resp) => {
		console.log(resp.register[0], new Date().getTime());
		return callback(null, true);
	}, (fail) => {
		console.log('failed');
		return callback(new Error(JSON.stringify(fail)));
	});
}
// // END GETTERS ////


// // BEGIN SETTERS ////
function setLight(mode, callback) {
	let register = undefined;
	let	check = undefined;


	if (mode === 'on') {
		register = 103;
		check = 0;
	} else if (mode === 'off') {
		register = 5;
		check = 256;
	} else {
		// throw error
	}

	if (client.getState() === 'connect' || client.getState() === 'ready') {

		client.readHoldingRegisters(FIREPLACE_STATUS_REG, 1).then((resp) => {
			if ((resp.register[0] & 256) === check) { // lights are off/on

				client.writeSingleRegister(FIREPLACE_ACTION_REG, register).then((switchResp) => {


					const interval = setInterval(() => {
						client.readHoldingRegisters(FIREPLACE_STATUS_REG, 1).then((res) => {
							// WATCH OUT REGISTER MIGHT NOT HAVE SWITCHED IMMEDIATELY
							if ((res.register[0] & 256 && mode === 'on') || ((res.register[0] & 256) === 0 && mode === 'off')) {
								console.log(`Turned lights ${mode}`);
								clearInterval(interval);
								return callback(null, true);
							}
						});
					}, 50);
				});

			} else {
				console.log(`Lights are already ${mode}`);
				return callback(null, false);
			}

		}).fail((err) => {
			console.log(`ERROR: ${err.err}`);
			return callback(err.message);


		});

	}
}

function setResetTimeout(mins, callback) {
	client.readHoldingRegisters(COMM_TIMEOUT_REG, 1).then((res) => {
		console.log(res);
		client.writeSingleRegister(COMM_TIMEOUT_REG, mins)
			.then((resp) => callback(null, true))
			.fail((err) => {
				console.log(err);
				return callback(err, null);
			});
	});
}

function setTest(mode, callback) {
	// light:103,5
	// main:101,3
	// pilot:100,2
	// second:102,4
	let wr;
	if (mode === 'on') {
		console.log('turning SECOND on');
		wr = 101;
	} else if (mode === 'off') {
		console.log('turning SECOND off');
		wr = 3;
	}
	client.writeSingleRegister(FIREPLACE_ACTION_REG, wr).then((resp) => {
		console.log(resp);
		callback(null, true);
	});
}

function setMain(mode,callback){
	client.readHoldingRegisters(FIREPLACE_STATUS_REG,1).then((resp)=>{
		if(resp.register){
			const status = resp.register[0];
			if( mode === 'on' && (status & 32768) === 0 && (status & 4) === 0){//ignition is allowed and main burner is off 
				client.writeSingleRegister(FIREPLACE_ACTION_REG,101).then((confirm) =>{

					const interval = setInterval(() => {

						setTimeout(()=>{
							clearInterval(interval);
						},TIMEOUT);//5 seconds, does create 100 intervals

						client.readHoldingRegisters(FIREPLACE_STATUS_REG, 1).then((check) => {
							// WATCH OUT REGISTER MIGHT NOT HAVE SWITCHED IMMEDIATELY
							if((check.register[0] & 4) === 4){//fireplace was turned on 
								callback(null,true);
							}
						});

					}, 50);

				});

				//check if fire is on and return cb
			}
			else if( mode === 'off' && (status & 4) === 4){
				client.writeSingleRegister(FIREPLACE_ACTION_REG,3).then((confirm) =>{

					const interval = setInterval(() => {

						setTimeout(()=>{
							clearInterval(interval);
						},TIMEOUT);//5 seconds, does create 100 intervals

						client.readHoldingRegisters(FIREPLACE_STATUS_REG, 1).then((check) => {
							// WATCH OUT REGISTER MIGHT NOT HAVE SWITCHED IMMEDIATELY
							if((check.register[0] & 4) === 4){//fireplace was turned on 
								callback(null,false);
							}
						});

					}, 50);
				});
			}
		}	
	})
}

// // END SETTERS ////

function checkFault(callback){
	client.readHoldingRegisters(FIREPLACE_STATUS_REG,1).then((check)=>{
		if(check.register[0] & 1)
		{
			console.log("Fault detected...")
			client.readHoldingRegisters(FAULT_DETAIL_REG,1).then((fault)=>{
				callback(null,fault.register[0]);
			});
		}else if((check.register[0] & 1)===0){
			callback(null,false);
		}else{
			console.log('error with faultchecking');
			callback(new Error('could not retrieve status register'));
		}

	});
}
// To implement status function

module.exports.add = add;

