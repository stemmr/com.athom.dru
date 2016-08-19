// Fireplace creates an object with connection details, function sto access the fireplace, a UnitId...
// Extra: make input of array of UnitIds to make >1 fireplace connections possible

var modbus = require('jsmodbus');
var udp = require('./UDPlistener.js');//udp.on('ip',callback is list of ip addresses

var ip;

udp.on('ip',(err,ips)=>{
  ip = ips;
  console.log(ips);
});

var runClient = module.exports = function(unitId,callback){
  var client = modbus.client.tcp.complete({
    host: '192.168.0.51',
    port: 502,
    autoReconnect: false,
    reconnectTimeout: 1000,
    timeout: 5000,
    unitId
  });

  client.connect();

  client.on('error', (err) => {
    callback(err);
    console.log(`CONNERR ${err}`);
  });

  client.on('close', (data) => {
    console.log('closed connection');
  });
  //console.log(callback.toString());
  //var p = callback.bind(client);
  client.once('connect',()=>{
    callback(client);
      return client;
  });
};

var fp = runClient(1,function(cli){
  console.log(cli);
  this.readHoldingRegisters(40201,8).then((data)=>{
    console.log('list of unitIds found ',data.register);
    var deviceList = [];
    data.register.forEach((elem)=>{
      if(elem){//register is 0(falsey) if not bound
        var dev = {
          data:{
            unitId:elem
          },
          name: 'Fireplace '+(elem-1)
        };
        deviceList.push(dev);
      }
    });
    callback(null, deviceList);
  }).fail((err)=>{
    console.log(`could not run client ${err}`);
  }).done(()=>{
    this.close();
  });

});

console.log(fp)
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
