'use strict'
var modbus = require('jsmodbus');
var mdns = require('mdns-js');


var queue = [];

const 	MODBUS_PORT = 502,//standard port for MODBUS
		FIREPLACE_STATUS_REG = 40203,
		FIREPLACE_ACTION_REG = 40200,
		ROOM_TEMPERATURE_REG = 40207,
		COMM_TIMEOUT_REG	 = 40202,
		RSSI_GATEWAY_REG	 = 40205,
		RSSI_DFGT_REG		 = 40206;


var unitID = 2, connID = 0;//default initial value

var client = undefined;
var commandQueue = [];
var currentCommand = undefined;

const funcs ={
	'light':light,
	'timeout':timeout
}

//Get IP address using mDNS
console.log('connecting...');


var browser = mdns.createBrowser('_modbus._tcp.local');

browser.on('ready', ()=>{
	browser.discover();
});

browser.on('update', (data) =>{

	console.log('address:', data.addresses[0]);

	var ip = data.addresses[0];
	client = modbus.client.tcp.complete({
		'host'				: ip,
		'port'				: MODBUS_PORT,
		'autoReconnect'		: false,
		//'reconnectTimeout'	: 1000,
		//'timeout'			: 5000,
		'unitId'			: unitID
	});

	client.connect();

	client.once('connect',function(){//once
		console.log(`connected to port ${client.port} on ${client.host}, using unitID ${client.unitId}`);
		nextCommand();//start running commands
	});

	client.on('error',function(err){
		console.log(`CONNERR ${err}`);
	});

	client.on('close',function(){
		console.log('closed connection');
	});

});




function light(mode,callback){
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
	
	if(client.getState() == 'connect' || client.getState() == 'ready'){
		
		client.readHoldingRegisters(FIREPLACE_STATUS_REG,1).then((resp) => {
			if((resp.register[0]&256) == check){//lights are off/on

				client.writeSingleRegister(FIREPLACE_ACTION_REG,register).then((switchResp) => {
					
					
					var interval = setInterval(() => {
						client.readHoldingRegisters(FIREPLACE_STATUS_REG,1).then((res) => {
						//WATCH OUT REGISTER MIGHT NOT HAVE SWITCHED IMMEDIATELY
							if((res.register[0]&256 && mode === 'on') || ((res.register[0]&256) === 0 && mode === 'off')){
								console.log(`Turned lights ${mode}`);
								clearInterval(interval);
								return callback(null, true);
							}
						});
					},50);	
				});

			}else{
				console.log(`Lights are already ${mode}`);
				return callback(null,false);
			}

		}).fail(function(err){
			console.log(`ERROR: ${err.err}`);
			return callback(err.message);
			

		});

	}
}

function reset(){

}

function timeout(mins, callback){
	client.readHoldingRegisters(COMM_TIMEOUT_REG,1).then((res) =>{
		console.log(res);
		client.writeSingleRegister(COMM_TIMEOUT_REG,mins).then((resp) =>{
			return callback(null, true);
		}).fail((err)=>{
			console.log(err);
			return callback(err, null);
		});
	});
	
}

function addToCommandQueue( commandId, args, callback ) {
	var callback = callback || function(){};

    commandQueue.push({
        commandId: commandId,
        args: args,
        callback: callback
    });

    if(client && client.getState() === 'connected'){
    	nextCommand();
    }
    
}

function nextCommand() {
    
    if( typeof currentCommand !== 'undefined' ) return;
    if( commandQueue.length < 1 ) return;
    
    currentCommand = commandQueue.shift();
    
    sendCommand( currentCommand.commandId, currentCommand.args, ( err, result ) => {
        currentCommand.callback( err, result );
        currentCommand = undefined;
        nextCommand();
    });
    
}

function sendCommand(commandId, args, callback){
	
	funcs[commandId].call(client,args,callback);
}

module.exports.addToCommandQueue = addToCommandQueue;