"use strict";
var modbus = require('jsmodbus');

let client = modbus.client.tcp.complete({
  host: '192.168.0.51',
  port: 502,
  autoReconnect: false,
  reconnectTimeout: 1000,
  timeout: 5000,
  unitId: 1
});

setInterval(()=>{
  console.log(client.getState());
},5);

client.connect();

client.on('connect',()=>{
  client.readHoldingRegisters(40200,1).then((res)=>{
    console.log(res);
  });
});

client.on('close',()=>{
  setTimeout(function () {

  }, 2000);
});
