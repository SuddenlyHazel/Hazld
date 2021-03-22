const assert = require("assert");
const myModule = require("..");

const originalStr1 = `

`
let foo = myModule.__getString(myModule.parse(myModule.__newString(originalStr1)));
console.log(foo);

console.log("ok");
