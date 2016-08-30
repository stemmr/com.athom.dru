"use strict";
var modbus = require('jsmodbus');

let client = modbus.client.tcp.complete({
  host: '192.168.0.51',
  port: 502,
  autoReconnect: false,
  reconnectTimeout: 1000,
  timeout: 5000,
  unitId: 2
});

client.connect();

client.on('connect',()=>{
  console.log('conn');
  client.readHoldingRegisters(40600,20).then((res)=>{
    console.log(res);
  });
});

client.on('close',()=>{

});

client.on('error',(err)=>{
  console.log(err);
});
