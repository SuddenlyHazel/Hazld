const assert = require("assert");
const myModule = require("..");

const originalStr1 = `
class Foo {
  bar() {
    return "baz";
  }
}

print Foo;
var a = Foo();

fun doThing() {
  print "wow!";
}

a.foo = doThing;
print a.bar();
`
let foo = myModule.__getString(myModule.parse(myModule.__newString(originalStr1)));
console.log(foo);

console.log("ok");
