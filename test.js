var mdns = require('mdns-js');
//if you have another mdns daemon running, like avahi or bonjour, uncomment following line
//mdns.excludeInterface('0.0.0.0');

var browser = mdns.createBrowser('_modbus._tcp.local');
console.log(browser);

browser.on('ready', function () {
    browser.discover();
});

browser.on('update', function (data) {
    console.log('data:', data);
});
