"use strict";
/*
*	Returns IP of gateway, only 1 IP per gateway(likely 1 per homey)
*/
const dgram = require('dgram');
const server = dgram.createSocket('udp4');

const EventEmitter = require('events');
var udp = new EventEmitter();

module.exports = udp;

var ip = [];//array of all discovered fireplace IPs

server.on('error', (err) => {
	console.log(`server error:\n${err.stack}`);
	udp.emit('error',err, null);
	server.close();
});

server.on('message', (msg, rinfo) => {
	//console.log(rinfo);
	if(msg.toString().indexOf('HWBRDG-DF') !== -1 ){

		if(ip.indexOf(rinfo.address) === -1){
			udp.ip = rinfo.address;
			udp.emit('ip',null,rinfo.address);
		}
	}
});

server.on('listening', () => {
	var address = server.address();
	console.log(`server listening ${address.address}:${address.port}`);
});

server.bind(35353);

// udp.on('ip',(err,ip)=>{
// 	console.log('ip found!', ip);
// });
