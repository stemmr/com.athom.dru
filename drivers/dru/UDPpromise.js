"use strict";
const dgram = require('dgram');
const server = dgram.createSocket('udp4');
let mdns = require('mdns-js');

let ipArray = [];

let ipAwait = function(){
  return new Promise((res,rej)=>{
  let browser = mdns.createBrowser('_modbus._tcp.local');

  browser.on('ready', function () {
      browser.discover();
  });

  browser.on('update', function (data) {
      res(data.addresses[0]);
  });

  server.once('error', (err) => {
  	console.log(`server error:\n${err.stack}`);
  	server.close();
    rej();
  });

  server.on('message', (msg, rinfo) => {
  	if(msg.toString().indexOf('HWBRDG-DF') !== -1 ){

  		if(ipArray.indexOf(rinfo.address) === -1){
        ipArray.push(rinfo.address);
        if(typeof rinfo.address === 'string'){
          res(rinfo.address);
        }
  		}
  	}
  });

  server.bind(35353);


  });
};
//ipWait.then(console.log,()=>{console.log('rejected');});
module.exports = ipAwait;
