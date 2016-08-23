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
              cli.close().once('close',()=>{
                console.log('closed gw');
                callback(null, deviceList);
              });
            })
            .fail((err)=>{
              cli.close().once('close', ()=>{
                  console.log(`could not run client ${err}`);
                  callback(null, null);
              });
            });
          });
          });
        });

      socket.on('add_device',(device, callback)=>{
        if(typeof device.data.unitId !== 'number' || device.data.unitId < 2)
        {
          callback(new Error('invalid uid'));
        }
        gateway.then((cli)=>{
          devices[device.data.unitId] = modbus.client.tcp.complete({
              host: cli.host,
              port: 502,
              unitId: device.data.unitId
            }).on('close', function(){
              console.log('closed new added', device.data.unitId);
            }).on('error',(err)=>{
              console.log(`error uid ${device.data.unitId} ${err}`);
            }).on('connect',()=>{
              console.log('connected', device.data.unitId);
            });
            console.log(devices);
            return callback(null,true);
        });

      });
  },
  capabilities: {
    light:{
      get:function(device_data, callback){
        operate(device_data.unitId, 'read', FIREPLACE_STATUS_REG).then((resp)=>{
          if (resp & 256) {
            return callback(null, 'on');
          } else if ((resp & 256) === 0) {
            return callback(null, 'off');
          }
        },(fail)=>{console.log(fail);});
      },
      set:function(device_data, args, callback){
        var stateReg = 0;
        if(args === 'on'){
          stateReg = 103;
        }else if(args === 'off'){
          stateReg = 5;
        }
        operate(device_data.unitId, 'write', FIREPLACE_ACTION_REG, stateReg).then((resp)=>{
          console.log(resp);
          callback(null,true);
        },(fail)=>{
          console.log(fail);
          callback(fail,false);
        });
      }
    },
    temp:{
      get:function(device_data, callback){
        operate(device_data.unitId, 'read', ROOM_TEMPERATURE_REG).then((resp)=>{
          callback(null,resp);
        },(fail)=>{
          console.log('failed get temp', fail);
          callback(fail);
        });
      },
      set:function(device_data, target, callback){

      }
    },
    main:{
      set:function(device_data, state, callback){
        console.log('arg', state);
        let stateReg = 0;
        if(state === 'on'){
          stateReg = 101;
        }else if(state === 'off'){
          stateReg = 3;
        }
        console.log('sreg',stateReg);
        operate(device_data.unitId, 'write',FIREPLACE_ACTION_REG,stateReg).then((resp)=>{
          console.log(resp);
          callback(null, true);
        },(fail)=>{
          console.log(fail);
          callback(fail, false);
        });
      },
      get:function(device_data, callback){

      }
    }
  },
  deleted:function(device_data){
    console.log('ds',devices);
    delete devices[device_data.unitId];
    console.log('deleted' + device_data.unitId, devices);
  }
};

function operate(unitId, rw, reg,ops){
  // unitId R/W register operation             callback
  // 0       1     2        3          ...      last
  let fp = devices[unitId];
  return new Promise((res,rej)=>{
    fp.connect();
    fp.once('connect',()=>{
      if(rw === 'read'){
        res(fp.readHoldingRegisters(reg, 1).then((resp)=>{
          //When to reject??
          return new Promise((res,rej)=>{
            fp.close();
            fp.once('close',()=>{
              console.log('hello');
              res(resp.register[0]);
            });
          });
        },(fail)=>{//could connect, modbus error
          fp.close();
          fp.once('close',()=>{
              console.log(fp.getStatus());
              console.log('read',fail);
              return Promise.reject(fail);
          });
        }));
      }else if(rw === 'write'){
        res(fp.writeSingleRegister(reg, ops).then((resp)=>{
          return new Promise((res, rej)=>{
            fp.close();
            fp.once('close',()=>{
              console.log(resp);
              res(resp);
            });
          });
        },(fail)=>{
          fp.close();
          fp.once('close',()=>{
            console.log(fail);
            return Promise.reject(fail);
          });
        }));
      }
    });
  });
}
