'use strict';
function init() {
  Homey.manager('flow').on('action.light_switch', (callback, args)=>{
    if(args.toggle === 'on'){
      Homey.manager('drivers').getDriver('dru').capabilities['onoff.light'].set(args.device,true,callback);
    }else if(args.toggle === 'off'){
      Homey.manager('drivers').getDriver('dru').capabilities['onoff.light'].set(args.device,false,callback);
    }
  });

	Homey.manager('flow').on('condition.light_status',(callback, args) =>{
		console.log(args);
		Homey.manager('drivers').getDriver('dru').capabilities['onoff.light'].get(args.device,callback);
	});

  Homey.manager('flow').on('condition.room_temp',(callback, args)=>{
    console.log(args);
    Homey.manager('drivers').getDriver('dru').capabilities.temp.get(args.device,(err, temp)=>{
      console.log(err, temp);
      if(err){
        return callback(err);
      }else if(args.temp_rel === 'larger' && temp > args.temp_set){
        return callback(null,true);
      }else if(args.temp_rel === 'smaller' && temp < args.temp_set){
        return callback(null,true);
      }else if(args.temp_rel === 'equal' && temp === args.temp_set){
        return callback(null, true);
      }
      return callback(null, false);

    });
  });

  Homey.manager('flow').on('condition.main_status',(callback, args)=>{
    Homey.manager('drivers').getDriver('dru').capabilities['onoff.main'].get(args.device, callback);
  });

  Homey.manager('flow').on('condition.secondary_status',(callback, args)=>{
    Homey.manager('drivers').getDriver('dru').capabilities['onoff.light'].get(args.device, callback);
  });

  Homey.manager('flow').on('action.main_switch',(callback, args)=>{
    if(args.toggle === 'on'){
      Homey.manager('drivers').getDriver('dru').capabilities['onoff.main'].set(args.device,true,callback);
    }else if(args.toggle === 'off'){
      Homey.manager('drivers').getDriver('dru').capabilities['onoff.main'].set(args.device,false,callback);
    }
  });

  Homey.manager('flow').on('action.secondary_switch',(callback, args)=>{
    if(args.toggle === 'on'){
      Homey.manager('drivers').getDriver('dru').capabilities['onoff.secondary'].set(args.device,true,callback);
    }else if(args.toggle === 'off'){
      Homey.manager('drivers').getDriver('dru').capabilities['onoff.secondary'].set(args.device,false,callback);
    }
  });

  Homey.manager('flow').on('action.main_height',(callback, args)=>{
    Homey.manager('drivers').getDriver('dru').capabilities.flame_height.set(args.device, args.height, (err,status)=>{
      if(err) return callback(err);
      console.log('set height ' + args.height);
      return callback(null, true);
    });
  });
}
module.exports.init = init;
