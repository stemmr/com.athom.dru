
var modbus = require('jsmodbus');

if(typeof client === 'undefined' || client.host !== ip){

  client = modbus.client.tcp.complete({
  host: '192.168.0.51',
  port: 502,
  autoReconnect: true,
  reconnectTimeout	: 1000,
  timeout			: 5000,
  unitId: 2,
  });
  client.connect();
}


client.once('connect', () => { // once

      console.log(`connected to port ${client.port} on ${client.host}, using unitID ${client.unitId}`);
      console.log(client.queueRequest.toString());

      //nextCommand(); // start running commands

  });

client.on('error', (err) => {
  console.log(`CONNERR ${err}`);
});

client.on('close', () => {
  console.log('closed connection');
});
