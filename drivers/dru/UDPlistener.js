"use strict";
const dgram = require('dgram');
const server = dgram.createSocket('udp4');
server.ip;

server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
	//console.log(rinfo);
	if(msg.toString().indexOf('HWBRDG-DF') !== -1 ){
		//console.log(server.ip);
		server.ip = rinfo.address;
	}
	//console.log(msg.toString(''));
  //console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
});

server.on('listening', () => {
  var address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
})

server.bind(35353);

module.exports = server;