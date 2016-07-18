"use strict"

// 'RIR' contains the "Function Code" that we are going to invoke on the remote device
var RIR = require('modbus-stack').FUNCTION_CODES.READ_INPUT_REGISTERS;

// IP and port of the MODBUS slave, default port is 502
var client = require('modbus-stack/client').createClient(502, '10.0.1.50');

// 'req' is an instance of the low-level `ModbusRequestStack` class
var req = client.request(RIR, // Function Code: 4
                         0,    // Start at address 0
                         50);  // Read 50 contiguous registers from 0

// 'response' is emitted after the entire contents of the response has been received.
req.on('response', function(registers) {
  // An Array of length 50 filled with Numbers of the current registers.
  console.log(registers);
  client.end();
});