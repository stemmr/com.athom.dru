'use strict';
function init() {

  Homey.manager('flow').on('action.light_switch', (callback, args)=>{
    console.log(args)
    Homey.manager('drivers').getDriver('dru').capabilities.light.set(args.device,args.toggle,(err,status)=>{
        if (err) return callback(err);
        console.log(`setting ${args.toggle}!`, status);
	      callback(null,status);
    });
  });
/*
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
				console.log(err);
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
