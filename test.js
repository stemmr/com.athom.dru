"use strict";

let p = {}
p.inte = setInterval(function () {
  console.log('diswork');
}, 1000);

setTimeout(function () {
    console.log(p);
    clearInterval(p.inte);
    console.log(p);
    delete p.inte;
    console.log(p)
}, 5000);
