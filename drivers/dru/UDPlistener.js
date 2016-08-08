"use strict";
/*
*	Creates an array of fireplace IPs
*
*/
module.exports = function(){

	const dgram = require('dgram');
	const server = dgram.createSocket('udp4');
	this.ip = [];//array of all discovered fireplace IPs

	server.on('error', (err) => {
	  console.log(`server error:\n${err.stack}`);
	  server.close();
	});

	server.on('message', (msg, rinfo) => {
		console.log(rinfo);
		if(msg.toString().indexOf('HWBRDG-DF') !== -1 ){

			if(this.ip.indexOf(rinfo.address) === -1){
				this.ip.push(rinfo.address);
			}
		}
	});

	server.on('listening', () => {
	  var address = server.address();
	  console.log(`server listening ${address.address}:${address.port}`);
	});

	server.bind(35353);
};
/*
var udp = new conn();
setInterval(()=>{
	if(typeof udp.ip !== 'undefined'){
		console.log(udp.ip);
	}
},2000);*/
