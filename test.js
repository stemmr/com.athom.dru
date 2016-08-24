var pr = new Promise(function(resolve, reject) {

});
pr.then(console.log);

var arr = [];
arr.push(pr);
pr.then();
console.log(arr[0]===pr)
