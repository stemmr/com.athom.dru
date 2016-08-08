/*jshint esversion: 6, devel: true, node: true*/
"use strict";
const modbus = require('jsmodbus');
const mdns = require('mdns-js');
const faultHandler = require('./faultHandler.js');
const UDPlistener = require('./UDPlistener.js');
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
let devices = [];
const commandQueue = [];
let currentCommand;
const status = {};


module.exports.init = function(devices_data, callback){
	console.log('init device.length:',devices_data.length);
	callback();
};

module.exports.capabilities = {
	light:{
		get:function(device_data, callback){

		},
		set:function(device_data, callback){
		}
	}
};

module.exports.added = function(device_data,callback){
	console.log('Device added:',device_data);
};

module.exports.pair = function(socket){

	let listener = new UDPlistener();

	let device = {
		data:{
			uid: undefined
		},
		name:'Fireplace Name'
	};

	console.log('pairing...');

	function updateView(err,device_data){
		if(err){
			console.log('Could not discover device');
		}else{
			device.data.uid = device_data.unitID;
		}
	}

	let listenInterval = setInterval(()=>{
		if((client === undefined && listener.ip !== undefined) ||(typeof client !== 'undefined' && client.host !== listener.ip)){
			devices.push(createClient(listener.ip,updateView));
		}
	},2000);

	const browser = mdns.createBrowser('_modbus._tcp.local');

	browser.on('ready', () => {
		console.log('Discovering IP with mDNS');
		browser.discover();

		browser.on('update', (data) => {
			const ip = data.addresses[0];

			console.log('address:', ip);
			clearInterval(listenInterval);

			devices.push(createClient(ip,updateView));
		});
	});

	browser.on('error',function(){
		console.log('err');
	});


	socket.on('list_devices', function(data,callback){
				console.log('list devices data:',data);
				console.log(device);
				callback(null, [device]);
			});


	socket.on('add_device', function( device, callback ){

			callback( null, true );
	});
};

module.exports.deleted = function(device_data){
	console.log(`Deleted UID ${device_data.uid}`);
	let removeIndex;
	devices.forEach((elem, index)=>{
			if(elem.unitId === device_data.uid){
				removeIndex = index;
			}
	});
	devices.splice(removeIndex,1);
	console.log(devices);
	client = undefined;
};

function add(commandId, args, callback) {

	var callback = callback || function(){};

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
	}

	if (typeof currentCommand.args === 'function' || typeof currentCommand.args === 'undefined') {
		currentCommand.args = cb;
	}
	funcs[currentCommand.commandId].call(client, currentCommand.args, cb);
}
// // END QUEUEING FUNCTIONS ////

function initDevice(){

}

function checkFault(callback){
	client.readHoldingRegisters(FIREPLACE_STATUS_REG,1).then((check)=>{

		if(check.register[0] & 1)
		{
			console.log("Fault detected...");
			client.readHoldingRegisters(FAULT_DETAIL_REG,1).then((fault)=>{
				callback(null,fault.register[0]);
			});
		}else if((check.register[0] & 1)===0){
			callback(null,false);//no fault detected
		}else{
			console.log('error with faultchecking');
			callback(new Error('could not retrieve status register'));
		}

	},(fail)=>{
		return callback(fail);
	});
}

//CLIENT FACTORY FUNCTION
function createClient(ip,callback){

	if(typeof client === 'undefined' || client.host !== ip){
		console.log('connin', ip);
		client = modbus.client.tcp.complete({
			host: ip,
			port: MODBUS_PORT,
			autoReconnect: false,
			reconnectTimeout	: 1000,
			timeout			: 5000,
			unitId: unitID,
		});
		client.connect();

		client.once('connect', () => { // once

			console.log('connect Event!');
			checkFault((err,fault)=>{
				if(err){
					console.log('error in fault checking',err);
					callback(err);
				}
				else if(fault){
					console.log(faultHandler[fault]);
					faultHandler[fault]();//throw fault to faulthandler
				}else if(!fault){
					var device_data = {
						unitID
					};
					console.log(`connected to port ${client.port} on ${client.host}, using unitID ${client.unitId}`);
					callback(null,device_data);
					nextCommand(); // start running commands
				}
			});
		});

		client.on('error', (err) => {
			callback(err);
			console.log(`CONNERR ${err}`);
		});

		client.on('close', () => {
			console.log('closed connection');
		});
		return client;
	}



}

function reset(callback){
	console.log('resetting...');
	client.readHoldingRegisters(FIREPLACE_STATUS_REG,1).then((status)=>{
		console.log('fireplace can be reset');
		//Fireplace can be reset
		if((status.register[0]&64)){
			console.log('fireplace can be reset');
			client.writeSingleRegister(FIREPLACE_ACTION_REG,1000).then((resp)=>{
					client.readHoldingRegisters(FIREPLACE_STATUS_REG,1).then((stat)=>{
						console.log('reset',stat.register[0]);
						return callback(null);
					});
			});
		}
	},(fail)=>{
		console.log('could not reset',fail);
		return callback(fail);
	});
}
