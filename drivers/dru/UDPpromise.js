"use strict";
const dgram = require('dgram');
const server = dgram.createSocket('udp4');
var mdns = require('mdns-js');

var browser = mdns.createBrowser('_modbus._tcp.local');

browser.on('ready', function () {
    browser.discover();
});



//add try/catch block in case of failure
let ipArray = [];

let ipAwait = function(){
  return new Promise((res,rej)=>{

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
        res(rinfo.address);
  		}
  	}
  });

  server.on('listening', () => {
  	var address = server.address();
  });

  server.bind(35353);


  });
};
//ipWait.then(console.log,()=>{console.log('rejected');});
module.exports = ipAwait;
