const assert = require("assert");
const myModule = require("..");

const originalStr1 = `
var a = "global";
fun bad() {
  print a;
  var a = "first";
  print a;
  var a = "second";
  return a;
}
print bad();
`
let foo = myModule.__getString(myModule.parse(myModule.__newString(originalStr1)));
console.log(foo);

console.log("ok");
