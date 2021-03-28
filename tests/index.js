const assert = require("assert");
const myModule = require("..");
const { Compiler } = require("../compiler/compiler");

const memory = myModule.memory;
const wasmByteMemoryArray = new Uint8Array(memory.buffer);
const program = `
var foo = 10;
var bar = 123;
print foo + bar;
`;


const compiler = new Compiler(program);
const progBytes = compiler.compile();
console.log("PROGRAM: ", progBytes)
const arrayPtr = myModule.__newArray(myModule.PROG_ARRAY, progBytes)

console.log(wasmByteMemoryArray.length);

myModule.run(arrayPtr)
