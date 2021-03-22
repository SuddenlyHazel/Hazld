const assert = require("assert");
const myModule = require("..");

const originalStr1 = `
fun makeCounter() {
    var i = 0;
    fun count() {
      i = i + 1;
      print i;
    }
  
    return count;
  }
  
  var counter = makeCounter();
  counter(); // "1".
  counter(); // "2".
`
let foo = myModule.__getString(myModule.parse(myModule.__newString(originalStr1)));
console.log(foo);

console.log("ok");
