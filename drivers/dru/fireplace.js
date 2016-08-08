// Fireplace creates an object with connection details, function sto access the fireplace, a UnitId...

var modbus = require('jsmodbus');
var udp = require('./UDPlistener.js');//udp.on('ip',callback is list of ip addresses

var client;
module.exports = (unitId)=>{
  udp.on('ip',(err,ip)=>{
    console.log(ip);
    client = modbus.client.tcp.complete({
      host: ip[0],
      port: 502,
      autoReconnect: true,
      reconnectTimeout: 1000,
      timeout: 5000,
      unitId
    });

    client.connect();

    client.once('connect', () => { // once

          console.log(`connected to port ${client.port} on ${client.host}, using unitID ${client.unitId}`);
          console.log(client);
          client.readHoldingRegisters(40002,2).then((res)=>{
            console.log(res);
          },(fail)=>{
            console.log('fail',fail);
          });
          //nextCommand(); // start running commands

      });

    client.on('error', (err) => {
      console.log(`CONNERR ${err}`);
    });

    client.on('close', () => {
      console.log('closed connection');
    });
  });
};




/*
if(typeof client === 'undefined' || client.host !== ip){


}*/
