const assert = require("assert");
const myModule = require("..");

const originalStr1 = `
class Foo {  
  init(a) {
    this.bar = a;
  }

  static noodles() {
    return "another one";
  }

  test() {
    return this.bar;
  }
}

var foo = Foo("test");
print foo.test();
print Foo.noodles();
`
//let foo = myModule.__getString(myModule.parse(myModule.__newString(originalStr1)));
//console.log(foo);

myModule.run()

console.log("ok");
