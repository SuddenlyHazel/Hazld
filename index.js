const fs = require("fs");
const loader = require("@assemblyscript/loader");

const [width, height] = [100, 100];
const arraySize = width * height;

const pageSize = 64 * 1024;
const nPages = Math.ceil(arraySize / pageSize);
const memory = new WebAssembly.Memory({ 
    initial: nPages 
  });
const imports = {
    module: {
      log: (msgPtr) => {
        console.log(`WASM >> ${getString(asModule, msgPtr)}`);
      }
    },
    env: {
      memory: memory,
      table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' })
    }
  };

const wasmModule = loader.instantiateSync(fs.readFileSync(__dirname + "/build/untouched.wasm"), imports);
console.log("Exports", wasmModule.exports);
module.exports = wasmModule.exports;
