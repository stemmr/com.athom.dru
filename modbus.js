'use strict'
var modbus = require('jsmodbus');


var queue = [];

const 	MODBUS_PORT = 502,//standard port for MODBUS
		FIREPLACE_STATUS_REG = 40203,
		FIREPLACE_ACTION_REG = 40200,
		ROOM_TEMPERATURE_REG = 40207;

var unitID = 2;//default initial value
var ip = '';

var funcs = {
	'light':light
}
var currentCommand;
//Potentially use callback for error handling
function connect(callback){
	//Get IP address using mDNS
	console.log('connecting...')
	ip = '192.168.0.51';
	var client = modbus.client.tcp.complete({
		'host'				: ip,
		'port'				: MODBUS_PORT,
		'autoReconnect'		: true,
		'reconnectTimeout'	: 1000,
		'timeout'			: 5000,
		'unitId'			: unitID
	});
	client.connect();

	client.once('connect',function(){//once
		console.log(`connected to port ${client.port} on ${client.host}, using unitID ${client.unitId}`);
		return callback(null,client);
	});

	client.on('error',function(err){
		console.log(err);
		return callback(err,null);
	});
}

function light(mode, callback){
	var callback = callback || function(){}
	var register = undefined, check = undefined;

	if(mode == 'on'){
		register = 103;
		check = 0;
	}else if(mode == 'off'){
		register = 5;
		check = 256;
	}else{
		//throw error
	}

	if(this.getState() == 'connect'){
		this.readHoldingRegisters(FIREPLACE_STATUS_REG,1).then((resp) => {
			
			if((resp.register[0]&256) == check){//lights are off/on
				this.writeSingleRegister(FIREPLACE_ACTION_REG,register).then(function(offresp){
					console.log(`Turned lights ${mode}`);
					callback(null);
				});
			}else{
				console.log(`Lights are already ${mode}`);
			}

		}).fail(function(err){

			console.log(err);

		});

	}
}


function addCommand(cmd, args, callback){
	var callback = callback || function(){}
	
	queue.push({
		'command':cmd,
		'args':args,
		'callback':callback
	});

	nextCommand();
}

function nextCommand(){
	
	if(typeof currentCommand !== 'undefined') {
		console.log('No task defined');
		return
	};
	if( queue.length < 1 ){
		console.log('No more tasks');
		return
	};

	
	currentCommand = queue.shift()
	
	connect((e,client) => {

		if(e){
			console.log(e);
			return
		}
		
		//potentially turn into apply if more arguments are required
		funcs[currentCommand.command].call(client, currentCommand.args,(err, result) => {
			console.log(currentCommand.callback);
			
			nextCommand();
			client.close();
		});

	});

}

module.exports = {
	'addCommand': addCommand
}