"use strict";
var makeClient = require('./fireplace.js');
var udp = require('./UDPlistener.js');
const devices = {};//object containing all currently initiated devices,key UID, value property is Fireplace object
var gateway;




module.exports = {
  init:function(devices_data, callback){

    udp.once('ip',(err,ip)=>{
      makeClient(1,(err,cli)=>{
        gateway = cli;
        for(var devi in devices_data){
          (function(dev){
            makeClient(devices_data[dev].unitId,(err,fireplace)=>{
              if(err){
                console.log('could not connect to given FP');
                return;
              }
              devices[devices_data[dev].unitId] = fireplace;
            });
          })(devi);

        }///connect all fireplaces with predefined UID

      });

      callback();
    });
  },
  pair:function(socket){

    console.log('pairing...');
    socket.on('list_devices', (data,callback)=>{

      gateway.readHoldingRegisters(40201,8).then((data)=>{
        console.log(data.register);
        var deviceList = [];
        data.register.forEach((elem)=>{
          if(elem){//register is 0(falsey) if not bound
            var dev = {
              data:{
                unitId:elem
              },
              name: 'Fireplace '+(elem-1)
            };
            deviceList.push(dev);
          }
        });
        callback(null, deviceList);
      });
    });

    socket.on('add_device',(device, callback)=>{
      makeClient(device.data.unitId,(err, cli)=>{
        devices[device.data.unitId] = cli;
      });
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
  deleted:function(device_data){
    if(devices[device_data.unitId]){
      delete devices[device_data.unitId];
    }
  }

};
