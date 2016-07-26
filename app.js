"use strict"
var fp = require('./modbus.js');

function init() {
	for(var i =0; i< 5; i++ )
	{
		fp.addToCommandQueue('light','on');
		fp.addToCommandQueue('light','off');
	}
}

module.exports.init = init;

