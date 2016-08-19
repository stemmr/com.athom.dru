"use strict";
//var runClient = require('./fireplace.js');
var ipPromise = require('./UDPpromise.js')();
var modbus = require('jsmodbus');
const devices = {};//object containing all currently initiated devices,key UID, value property is Fireplace object

const FIREPLACE_STATUS_REG = 40203;
const FIREPLACE_ACTION_REG = 40200;
const FAULT_DETAIL_REG = 40204;
const ROOM_TEMPERATURE_REG = 40207;
const COMM_TIMEOUT_REG = 40202;
const RSSI_GATEWAY_REG = 40205;
const RSSI_DFGT_REG = 40206;

var gateway = ipPromise.then((ip)=>{
    console.log('got',ip);
    let client = modbus.client.tcp.complete({
      host: ip,
      port: 502,
      autoReconnect: false,
      reconnectTimeout: 1000,
      timeout: 5000,
      unitId: 1
    });
    client.on('close', function(){
              console.log('closed gateway connection');
            })
          .on('error',(err)=>{
            console.log('gw error', err);
          });
    return client;
});


module.exports = {
  init:function(devices_data, callback){
    gateway.then((cli)=>{
      devices_data.forEach((elem)=>{

        devices[elem.unitId] = modbus.client.tcp.complete({
            host: cli.host,
            port: 502,
            autoReconnect: false,
            reconnectTimeout: 1000,
            timeout: 5000,
            unitId: elem.unitId
          }).on('close', function(){
              console.log('closeded inited', elem.unitId);
              })
            .on('error',(err)=>{
              console.log(err);
              })
            .on('connect',()=>{
              console.log('connected', elem.unitId);
            });
      });
        console.log('made all the fireplaces');
        return callback(null,true);
    });
  },
  pair:function(socket){
    console.log('pairing...');
    socket.on('list_devices', (data,callback)=>{
        gateway.then((cli)=>{
          //retrieve all devices bound to gateway
          cli.connect().once('connect',()=>{
            cli.readHoldingRegisters(40201,8).then((data)=>{
              console.log('list of unitIds found ',data.register);
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
              console.log(deviceList);
              cli.close().on('close',()=>{
                console.log('closed gw');
                callback(null, deviceList);
              });
            })
            .fail((err)=>{
              cli.close().on('close', ()=>{
                  console.log(`could not run client ${err}`);
                  callback(null, null);
              });
            });
          });
          });
        });

      socket.on('add_device',(device, callback)=>{
        gateway.then((cli)=>{
          devices[device.unitId] = modbus.client.tcp.complete({
              host: cli.host,
              port: 502,
              autoReconnect: false,
              reconnectTimeout: 1000,
              timeout: 5000,
              unitId: device.unitId
            }).on('close', function(){
              console.log('closed new added', device.unitId);
            }).on('error',(err)=>{
              console.log(`error uid ${device.unitId} ${err}`);
            }).on('connect',()=>{
              console.log('connected', device.unitId);
            });
        });
        callback(null,true);
      });
  },
  capabilities: {
    light:{
      get:function(device_data, callback){
        console.log(devices);
        let fireplace = devices[device_data.unitId];
        fireplace.connect();
        fireplace.once('connect',()=>{

          fireplace.readHoldingRegisters(FIREPLACE_STATUS_REG, 1).then((resp) => {
            fireplace.close().on('close',()=>{
              const reg = resp.register[0];

          		if (reg & 256) {
          			return callback(null, 'on');
          		} else if ((reg & 256) === 0) {
          			return callback(null, 'off');
          		}

          		console.log('else');
          		return callback(new Error('could not get status', null));

            });
        	}, (err) => {
        		console.log('in getting light status: ',err);
            fireplace.close().on('close',()=>{
                return callback(new Error('failed status'), null);
            });
        	});
        });
      },
      set:function(device_data, args, callback){
        let fireplace = devices[device_data.unitId];
        fireplace.connect();
        fireplace.once('connect',()=>{
            //console.log('sets',devices[device_data.unitId]);
            var stateReg = 0;
            if(args === 'on'){
              stateReg = 103;
            }else if(args === 'off'){
              stateReg = 5;
            }
            fireplace.writeSingleRegister(FIREPLACE_ACTION_REG,stateReg).then(()=>{
              console.log('actually turned', args);
              fireplace.close();
              fireplace.once('close',()=>{
                  callback(null,true);
              });
            },(fail)=>{
              fireplace.close();
              fireplace.once('close',()=>{
                console.log('seterr',fail);
                callback(null,false);
              });
            });
          });
      }
    },
    temp:{
      get:function(device_data, callback){

      },
      set:function(device_data, target, callback){

      }
    }

  },
  deleted:function(device_data){
    delete devices[device_data.unitId];
    console.log('deleted' + device_data.unitId);
  }
};
