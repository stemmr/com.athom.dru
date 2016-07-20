"use strict"
var fp = require('./modbus.js');

fp.addToCommandQueue('light','on');
fp.addToCommandQueue('light','off');
fp.addToCommandQueue('light','on');




function init() {
	
}

module.exports.init = init;

