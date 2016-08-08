var Fireplace = require('./fireplace.js');

const devices = {};//object containing all currently initiated devices,key UID, value property is Fireplace object



module.exports = {
  init:function(devices_data, callback){

  },
  pair:function(socket){

    socket.on('list_devices', (data,callback)=>{

    });

    socket.on('add_device',(device, callback)=>{

    });
  },
  capabilities: {
    main:{
      get:function(device_data, callback){

      },
      set:function(device_data, callback){

      }
    }

  },
  deleted:function(){

  }

};
