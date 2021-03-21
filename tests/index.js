const assert = require("assert");
const myModule = require("..");

const originalStr1 = `


var a = 0;
for (var b = 1; b < 100; b = b + 1) {
    print b;
}
foo();
`
let foo = myModule.__getString(myModule.parse(myModule.__newString(originalStr1)));
console.log(foo);

console.log("ok");
