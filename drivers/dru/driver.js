"use strict";
//var runClient = require('./fireplace.js');
var ipPromise = require('./UDPpromise.js')();
var modbus = require('jsmodbus');
const devices = {};//object containing all currently initiated devices,key UID, value property is Fireplace object

const FIREPLACE_ACTION_REG = 40200;
const FLAME_HEIGHT_REG = 40201;
const COMM_TIMEOUT_REG = 40202;
const FIREPLACE_STATUS_REG = 40203;
const FAULT_DETAIL_REG = 40204;
const RSSI_GATEWAY_REG = 40205;
const RSSI_DFGT_REG = 40206;
const ROOM_TEMPERATURE_REG = 40207;



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
            console.log(cli.unitId);
            cli.readHoldingRegisters(40201,7).then((data)=>{
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
        console.log(socket);
        if(typeof device.data.unitId !== 'number' || device.data.unitId < 2)
        {
          callback(new Error('invalid uid'));
        }
        gateway.then((cli)=>{
          console.log('making',device);


        });
      });

      socket.on('checkfail',(device, callback)=>{
        console.log('chf',device);
        console.log(gateway);
        gateway.then((cli)=>{
          devices[device.unitId] = modbus.client.tcp.complete({
              host: cli.host,
              port: 502,
              unitId: device.unitId
            }).on('close', function(){
              console.log('closed new added', device.unitId);
            }).on('error',(err)=>{
              console.log('devsate',devices[2].getState());
              console.log(`error uid ${device.unitId} ${err}`);
            }).on('connect',()=>{
              console.log('connected', device.unitId);
            });

          operate(device.unitId, 'read', FIREPLACE_STATUS_REG).then((resp)=>{
            console.log('pairresp', resp);
            if(resp&1){//if fault active
              console.log('FAULT');
              operate(devices[device.unitId],'read',FAULT_DETAIL_REG).then((resp)=>{
                  return callback(null, resp);
              });
            }else{
                return callback(null, true);
            }
          },(fail)=>{
            console.log('could not pair', fail);
            callback(fail);
          });
        },()=>{
          console.log('rejected');
        });
      });
  },
  capabilities: {
    "onoff.light":{
      get:function(device_data, callback){
        console.log('getting light');
        operate(device_data.unitId, 'read', FIREPLACE_STATUS_REG).then((resp)=>{
          callback(null, !!(resp & 256));
        },callback);//onfail pass as err

      },
      set:function(device_data, state, callback){
        console.log('setting light');
        var stateReg = 0;
        if(state){
          stateReg = 103;
        }else if(!state){
          stateReg = 5;
        }
        console.log('sreg',stateReg);
        operate(device_data.unitId, 'write', FIREPLACE_ACTION_REG, stateReg).then((resp)=>{
          console.log(resp);
          callback(null,true);
        },(fail)=>{
          console.log(fail);
          callback(fail);
        });
      }
    },
    "onoff.main":{
      get:function(device_data, callback){
        console.log('get main');
        operate(device_data.unitId,'read', FIREPLACE_STATUS_REG).then((resp)=>{
          callback(null,!!(resp & 4));
        },callback);
      },
      set:function(device_data, state, callback){
        console.log('set main');
        let stateReg = 0;
        if(state){
          stateReg = 101;
        }else if(!state){
          stateReg = 3;
        }
        operate(device_data.unitId, 'write',FIREPLACE_ACTION_REG,stateReg).then((resp)=>{
          console.log(resp);
          callback(null, true);
        },(fail)=>{
          console.log(fail);
          callback(fail, false);
        });
      }
    },
    "onoff.secondary":{

      get:function(device_data, callback){
        console.log('get sec');
        operate(device_data.unitId,'read', FIREPLACE_STATUS_REG).then((resp)=>{
          callback(null,!!(resp & 8));
        },(fail)=>{
          console.log(fail);
          callback(fail);
        });
      },
      set:function(device_data,state, callback){
        console.log('set sec');
        let stateReg = 0;
        if(state){
          stateReg = 102;
        }else if(!state){
          stateReg = 4;
        }
        operate(device_data.unitId, 'write',FIREPLACE_ACTION_REG,stateReg).then((resp)=>{
          console.log(resp);
          callback(null, true);
        },(fail)=>{
          console.log(fail);
          callback(fail, false);
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
    flame_height:{
      set:function(device_data, height, callback){
        console.log('flheight', height);
        if(height >= 0 && height <= 100){
            operate(device_data.unitId, 'write', FLAME_HEIGHT_REG, height).then((resp)=>{
              console.log(resp);
              callback(null, true);
            },(fail)=>{
              console.log('error setting flame height',fail);
              callback(fail, false);
            });
        }
      },
      get:function(device_data, callback){
        callback(null, 50);
      }
    }
  },
  deleted:function(device_data){
    console.log('ds',devices);
    delete devices[device_data.unitId];
    console.log('deleted' + device_data.unitId, devices);
  }
};

var taskQ =[];

function operate(unitId, rw, reg,ops){
  // unitId R/W register operation             callback
  // 0       1     2        3          ...      last
  let fp = devices[unitId];
  if(!fp) return Promise.reject(new Error('cannot connect to fireplace'));
  console.log(unitId, fp.getState());
  if(fp.getState() !== 'init' && fp.getState() !== 'closed'){
    //might break because it doesnt check for taskQ.length >0
    var taskProm = new Promise(function(resolve, reject) {
      fp.on('close',()=>{
        if(taskQ[0] === taskProm){
          taskQ.shift();
          operate(unitId, rw, reg, ops).then((resp)=>{
            resolve(resp);
          });
        }
      });
    });
    taskQ.push(taskProm);
    console.log('append',taskQ);
    return taskProm;
  }else{
    return new Promise((res,rej)=>{
      fp.connect();
      fp.once('connect',()=>{
        fp.readHoldingRegisters(FIREPLACE_STATUS_REG,1).then((status)=>{
          if(status.register[0] & 1){
            //FAULT
            fp.writeSingleRegister(FIREPLACE_ACTION_REG, 1000).then(()=>{
              fp.readHoldingRegisters(FIREPLACE_STATUS_REG,1).then((fres)=>{
                if(fres.register[0]&1){
                  fp.close().once('close',()=>{
                      rej(new Error('Could not resolve fault'));
                  });
                  //you're screwed
                }else{
                  fp.close().once('close',()=>{
                    rej(new Error('Resolved Fault, retry command'));
                  });
                }
              });
            });
          }else{
            if(rw === 'read'){
              fp.readHoldingRegisters(reg, 1).then((resp)=>{
                //When to reject??
                  fp.close();
                  fp.once('close',()=>{
                    res(resp.register[0]);
                  });
              },(fail)=>{//could connect, modbus error
                fp.close();
                fp.once('close',()=>{
                    console.log(fp.getStatus());
                    console.log('read',fail);
                    rej(fail);
                });
              });
            }else if(rw === 'write'){
              fp.writeSingleRegister(reg, ops).then((resp)=>{
                  fp.close();
                  fp.once('close',()=>{
                    console.log(resp);
                    res(resp);
                  });

              },(fail)=>{
                fp.close();
                fp.once('close',()=>{
                  console.log(fail);
                  rej(fail);
                });
              });
            }
          }
        });
      });

  });
}
}
