const assert = require("assert");
const myModule = require("..");
const { Compiler } = require("../compiler/compiler");

const memory = myModule.memory;
const wasmByteMemoryArray = new Uint8Array(memory.buffer);
const program = `
fun test(a, b) {
  print a;
  print b;
};

test(1, 100);
`;


const compiler = new Compiler(program);
const progBytes = compiler.compile()[0]
console.log("PROGRAM: ", progBytes)
const arrayPtr = myModule.__newArray(myModule.PROG_ARRAY, progBytes)

console.log(wasmByteMemoryArray.length);

myModule.run(arrayPtr)
