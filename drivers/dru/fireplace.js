// Fireplace creates an object with connection details, function sto access the fireplace, a UnitId...
// Extra: make input of array of UnitIds to make >1 fireplace connections possible

var modbus = require('jsmodbus');
var udp = require('./UDPlistener.js');//udp.on('ip',callback is list of ip addresses

var client;
var ip;

udp.on('ip',(err,ips)=>{
  ip = ips;
  //console.log(ips);
});

module.exports = function(unitId,callback){
  client = modbus.client.tcp.complete({
    host: ip,
    port: 502,
    autoReconnect: false,
    reconnectTimeout: 1000,
    timeout: 5000,
    unitId
  });

  client.connect();

  client.once('connect', () => { // once

        console.log(`connected to port ${client.port} on ${client.host}, using unitID ${client.unitId}`);
        callback(null, client);
        //nextCommand(); // start running commands

    });

  client.on('error', (err) => {
    callback(err);
    console.log(`CONNERR ${err}`);
  });

  client.on('close', () => {
    console.log('closed connection');
  });

};
/*
client.prototype.add = function(func, args, callback) {

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

client.prototype.nextCommand = function() {

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
	funcs[currentCommand.commandId].call(client, currentCommand.args, cb);
}




/*
if(typeof client === 'undefined' || client.host !== ip){


}*/
