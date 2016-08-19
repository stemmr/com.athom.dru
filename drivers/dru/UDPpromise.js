"use strict";
const dgram = require('dgram');
const server = dgram.createSocket('udp4');

//add try/catch block in case of failure
let ipArray = [];

let ipAwait = function(){
  return new Promise((res,rej)=>{
  server.once('error', (err) => {
  	console.log(`server error:\n${err.stack}`);
  	server.close();
    rej();
  });

  server.on('message', (msg, rinfo) => {
  	//console.log(rinfo);
  	if(msg.toString().indexOf('HWBRDG-DF') !== -1 ){

  		if(ipArray.indexOf(rinfo.address) === -1){
        ipArray.push(rinfo.address);
        res(rinfo.address);
  		}
  	}
  });

  server.on('listening', () => {
  	var address = server.address();
  	console.log(`server listening ${address.address}:${address.port}`);
  });

    server.bind(35353);
  });
};
//ipWait.then(console.log,()=>{console.log('rejected');});
module.exports = ipAwait;
