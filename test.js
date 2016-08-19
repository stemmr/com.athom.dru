function Cons(a){
  this.data = a;
  var priv = function(b){
    console.log('Im private', b);
  };
}

Cons.prototype.gen = 42;

var p = new Cons(15);

console.log(p.data);
console.log(p.__proto__.__proto__);
