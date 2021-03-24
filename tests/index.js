const assert = require("assert");
const myModule = require("..");

const originalStr1 = `

class Cake {
  taste() {
    var adjective = "delicious";
    print "The " + this.flavor + " cake is " + adjective + "!";
  }
}

var cake = Cake();
cake.flavor = "German chocolate";
cake.taste(); // Prints "The German chocolate cake is delicious!".

`
let foo = myModule.__getString(myModule.parse(myModule.__newString(originalStr1)));
console.log(foo);

console.log("ok");
