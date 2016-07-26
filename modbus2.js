var mbstack = require('modbus-stack');

var client = require('modbus-stack/client').createClient(502,'192.168.1.51');

var req = client.request(3,40000,1);

req.on('response', function(registers){
	console.log(registers);
	client.end();
});

Homey.log(mbstack);