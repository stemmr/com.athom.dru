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
              //console.log('closeded inited', elem.unitId);
              })
            .on('error',(err)=>{
              if(err.errno !== 'ECONNRESET') console.log(err.errno);

              })
            .on('connect',()=>{
              //console.log('connected', elem.unitId);
            });
        devices[elem.unitId].settingsInterval = setInterval( setFireplaceSettings, 5000, elem);
      });
        console.log('finished making fireplaces');
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
        gateway.then((cli)=>{
          devices[device.unitId] = modbus.client.tcp.complete({
              host: cli.host,
              port: 502,
              unitId: device.unitId
            }).on('close', function(){
              //console.log('closed new added', device.unitId);
            }).on('error',(err)=>{
              //console.log('devsate',devices[2].getState());
              if(err.errno !== 'ECONNRESET') console.log(err);
                //console.log(`error uid ${device.unitId} ${err}`);
            }).on('connect',()=>{
              //console.log('connected', device.unitId);
            });

          operate(device.unitId, 'read', FIREPLACE_STATUS_REG).then((resp)=>{
            devices[device.unitId].settingsInterval = setInterval(function () {
                setFireplaceSettings(device);
            }, 5000);
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
          callback(null, true);
        },(fail)=>{
          callback(fail, false);
        });
      }
    },
    "onoff.secondary":{

      get:function(device_data, callback){
        operate(device_data.unitId,'read', FIREPLACE_STATUS_REG).then((resp)=>{
          callback(null,!!(resp & 8));
        },(fail)=>{
          callback(fail);
        });
      },
      set:function(device_data,state, callback){
        let stateReg = 0;
        if(state){
          stateReg = 102;
        }else if(!state){
          stateReg = 4;
        }
        operate(device_data.unitId, 'write',FIREPLACE_ACTION_REG,stateReg).then((resp)=>{
          callback(null, true);
        },(fail)=>{
          callback(fail, false);
        });
      }
    },
    temp:{
      get:function(device_data, callback){
        operate(device_data.unitId, 'read', ROOM_TEMPERATURE_REG).then((resp)=>{
          callback(null,resp);
        },(fail)=>{
          callback(fail);
        });
      },
      set:function(device_data, target, callback){

      }
    },
    flame_height:{
      set:function(device_data, height, callback){
        let setHeight = height * 100;
        if(setHeight >= 0 && setHeight <= 100){
            operate(device_data.unitId, 'write', FLAME_HEIGHT_REG, setHeight).then((resp)=>{
              callback(null, true);
            },(fail)=>{
              callback(fail, false);
            });
        }
      },
      get:function(device_data, callback){
        callback(null, 90);
      }
    },
    flame_enum:{
      set:function (device_data, state, callback) {
        if(state === 'both'){
          operate(device_data.unitId,'write',FIREPLACE_ACTION_REG,102).then(resp=>{
            callback(null, true);
          },console.log);
        }else if(state === 'single'){
          console.log('gottosingle');
          operate(device_data.unitId, 'read', FIREPLACE_STATUS_REG).then(resp =>{
            //main and second burner are on
            if((resp & 4) && (resp & 8)){
              operate(device_data.unitId,'write',FIREPLACE_ACTION_REG, 4).then(resp=>{
                callback(null, true);
              },callback);
            }else if(!(resp & 4) && !(resp & 8)){
              operate(device_data.unitId, 'write', FIREPLACE_ACTION_REG, 101).then(resp=>{
                console.log('both are off');
                operate(device_data.unitId, 'write', FIREPLACE_ACTION_REG, 4);
              }, callback);
            }
          },callback);
        }else if(state === 'off'){
          operate(device_data.unitId,'write',FIREPLACE_ACTION_REG,3).then(resp =>{
            callback(null, true);
          });
        }else{
          console.log('invalid state');
          callback(new Error('inv state'));
        }
        console.log('gternary',device_data, state);
      },
      get:function (device_data, callback) {
        operate(device_data.unitId,'read',FIREPLACE_STATUS_REG).then(resp =>{
          if((resp & 4) && (resp & 8)){
            return callback(null, 'both');
          }else if(resp & 4){
            return callback(null, 'single');
          }else if(!(resp & 4) && !(resp & 8)){
            return callback(null, 'off');
          }else{
            return callback(new Error('Invalid flame settings'));
          }
        });
      }
    }
  },
  deleted:function(device_data){
    clearInterval(devices[device_data.unitId].settingsInterval);
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
    return taskProm;
  }else{
    return new Promise((res,rej)=>{
      fp.connect();
      fp.once('connect',()=>{
        fp.readHoldingRegisters(FIREPLACE_STATUS_REG,1).then((status)=>{
          if(status.register[0] & 1){
            //FAULT make this 1000 to automatically handle faults
            fp.writeSingleRegister(FIREPLACE_ACTION_REG, 0).then(()=>{
              fp.readHoldingRegisters(FIREPLACE_STATUS_REG,1).then((fres)=>{
                  if(fres.register[0]&1){
                    fp.close().once('close',()=>{
                      rej(new Error('You must manually resolve the fault'));
                      //manually resolve fault
                    });

                  }else{//should not happen
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

function setFireplaceSettings(device_data){
  //console.log('setting data');
  let setts = {};
  let pArray = [];
  pArray.push(operate(device_data.unitId,'read', FIREPLACE_STATUS_REG));// 0
  pArray.push(operate(device_data.unitId,'read', FAULT_DETAIL_REG));// 1
  pArray.push(operate(device_data.unitId,'read', ROOM_TEMPERATURE_REG));// 2
  pArray.push(operate(device_data.unitId,'read', RSSI_GATEWAY_REG));//3
  pArray.push(operate(device_data.unitId,'read', RSSI_DFGT_REG));//4

  return Promise.all(pArray).then(setArray =>{
    console.log(setArray);
    let statusReg = setArray[0];
    let faultNumber = setArray[1];
    //setts.fault = (statusReg & 1) ? ('Fault '+ faultNumber) : 'No faults';
    //Have removed automatic fault handling until I can better support it
    setts.pilot = (statusReg & 2) ? "on" : "off";
    setts.main = (statusReg & 4) ? "on" : "off";
    setts.secondary = (statusReg & 8) ? "on" : "off";
    setts.light = (statusReg & 256) ? "on" : "off";
    setts.rcbound = (statusReg & 2048) ? "connected" : "disconnected";
    setts.flame_possible = (statusReg & 32768) ? "ignition currently not possible" : "ignition possible";

    if(setArray[2] < 700) setts.temperature = (setArray[2]/10).toString();
    //console.log(setArray);

    //multiply by -0.5 according to docs
    let gwRSSI = -0.5*setArray[3];
    if(gwRSSI > -55) setts.rssi_gateway = 'very good';
    else if(gwRSSI > -70) setts.rssi_gateway = "good";
    else if(gwRSSI > -80) setts.rssi_gateway = "bad";
    else if(gwRSSI < -80) setts.rssi_gateway = "very bad";

    let dfgtRSSI = -0.5*setArray[4];
    if(dfgtRSSI > -55) setts.rssi_dfgt = 'very good';
    else if(dfgtRSSI > -70) setts.rssi_dfgt = "good";
    else if(dfgtRSSI > -80) setts.rssi_dfgt = "bad";
    else if(dfgtRSSI < -80) setts.rssi_dfgt = "very bad";

    module.exports.setSettings(device_data, setts);
    //console.log(setArray);
  },fail =>{
    console.log('me no set status', fail);
  });
}
