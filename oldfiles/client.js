"use strict";
var modbus = require('jsmodbus');

var ipPromise = new Promise(function(resolve, reject) {
  setTimeout(resolve, 2000);
});

var gateway = ipPromise.then((ip)=>{

    let client = modbus.client.tcp.complete({
      host: ip,
      port: 502,
      autoReconnect: false,
      reconnectTimeout: 1000,
      timeout: 5000,
      unitId: 1
    });
    client.on('close', function(){
              console.log('closed gateway connection');
            })
          .once('error',(err)=>{
            console.log('gw error', err);
          });
    return client;
});

gateway.then((gw)=>{
  console.log(gw);
});
console.log(gateway);
