"use strict"
const dgram = require('dgram');
const modbus = require('modbus-stack');

function init() {
	var sock = dgram.createSocket('udp4');
	sock.bind(35353);

	sock.on('message',(msg, rinfo) => {
		console.log('got the message');
	});

	sock.on('listening',() => {
		Homey.log('listening to UDP');
	});
}

module.exports.init = init;

