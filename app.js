'use strict';
const fp = require('./modbus.js');

fp.add('setLight','on');
fp.add('setLight','off');

/*
setInterval(() => {
	//fp.add('setLight','on');
	fp.add('getTest');
}, 500);
/*
setTimeout(() => {
	fp.add('setTest', 'off');
}, 20000);


/* fp.add('setTest','on',function(){
	setTimeout(()=>{
		fp.add('setTest','off');
	},5000);
});*/

// setTimeout(,2000);

// fp.add('setLight','on');
// fp.add('setLight','off');

function init() {
	
	/*
	fp.add('setLight','off');
	//fp.add('setLight','off');
	setInterval(()=>{
		fp.add('getTest',(err,res) =>{
			///console.log(res);
		});
	},2500);


	Homey.manager('flow').on('action.light_switch', (callback, args)=>{
		if(args.toggle === 'on'){

			fp.add('setLight','on',(err,result)=>{
				if(err) return callback(err);
				callback(null,result);
			});

		}else if(args.toggle === 'off'){

			fp.add('setLight','off',(err,result)=>{
				if(err) return callback(err);
				callback(null,result);
			});

		}else{

			callback(new Error('neither on nor off'));
		}
	});

	Homey.manager('flow').on('condition.light_status',(callback) =>{
		console.log('checking status of lights...');
		fp.add('getLight', (err, res)=>{
			console.log('got light status' + res + err);
			if(err) return callback(err,null);

			if(res){
				return callback(null, true);
			}else if(res === false){
				return callback(null, false);
			}
		});
	});

	Homey.manager('flow').on('condition.room_temp',(callback, args)=>{
		console.log(args.temp_rel === 'larger');
		fp.add('getTemp',(err,temp)=>{
			if(err){
				consoel.log(err);
				return callback(err);
			}
			if(args.temp_rel === 'larger' && args.temp_set < temp){

				return callback(null, true);

			}else if(args.temp_rel === 'equal' && args.temp_set === temp){

				return callback(null, true);

			}else if(args.temp_rel === 'smaller' && args.temp_set > temp){

				return callback(null,true);

			}else{

				return callback(null,false);

			}
		});
	});
*/

}

module.exports.init = init;

