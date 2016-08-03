//const fp = require('./modbus.js')

module.exports = {
	'14': ()=>{
		console.log('Fault number 14 detected.');
		fp.reset((err)=>{
			if(err) return;
			checkFault((err2)=>{
				if(err2) return;
				fp.nextCommand();
			})
		});

	},

	'8': ()=>{
		console.log('Connection fault detected.(FP is not connected)');
	}
}
