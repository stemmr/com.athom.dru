'use strict'
var modbus = require('jsmodbus');


var queue = [];

const 	MODBUS_PORT = 502,//standard port for MODBUS
		FIREPLACE_STATUS_REG = 40203,
		FIREPLACE_ACTION_REG = 40200,
		ROOM_TEMPERATURE_REG = 40207;

var unitID = 2, connID = 0;//default initial value
var ip = '';
var client = undefined;
var commandQueue = [];
var currentCommand = undefined;

const funcs ={
	'light':light
}

function D(msg){
	console.log(msg);
}


//Get IP address using mDNS
console.log('connecting...');

ip = '192.168.0.51';
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
})


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
							if((res.register[0]&256 && mode === 'on') || (res.register[0]&256 && mode === 'off')){
								console.log(`Turned lights ${mode}`);
								clearInterval(interval);
								return callback(null, true);
							}
						});
					},100);	
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

function addToCommandQueue( commandId, args, callback ) {
	var callback = callback || function(){};

    commandQueue.push({
        commandId: commandId,
        args: args,
        callback: callback
    });

    if(client.getState() == 'connected'){
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