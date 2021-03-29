import { OpCodes, ValueType } from "../shared/vm_types";

enum VmValueType {
    NIL,
    NUMBER,
    BOOLEAN,
    ADDRESS,
    FUNCTION
}

abstract class VmValue {
    abstract toString(): string;
    abstract getType(): VmValueType;
    abstract equal(other: VmValue): boolean;
};

class VmFunctionValue extends VmValue {
    constructor(public value: i32, public arity: i32, public varNames: string[]) {
        super();
    }

    toString(): string {
        return this.value.toString();
    }

    getType(): VmValueType {
        return VmValueType.FUNCTION;
    }

    equal(other: VmValue): boolean {
        // NYI
        return false;
    }
}

class VmNumberValue extends VmValue {
    constructor(public value: f64) {
        super();
    }

    toString(): string {
        return this.value.toString();
    }

    getType(): VmValueType {
        return VmValueType.NUMBER;
    }

    equal(other: VmValue): boolean {
        switch (other.getType()) {
            case VmValueType.NUMBER:
                return (<VmNumberValue>other).value == this.value;
        }
        return false;
    }
}

class VmBooleanValue extends VmValue {
    constructor(public value: boolean) {
        super();
    }

    toString(): string {
        return this.value.toString();
    }

    getType(): VmValueType {
        return VmValueType.ADDRESS;
    }

    // TODO
    equal(other: VmValue): boolean {
        return false;
    }
}

// Points to a spot a stack
class VmAddressValue extends VmValue {
    constructor(public value: i32) {
        super();
    }

    toString(): string {
        return this.value.toString();
    }

    getType(): VmValueType {
        return VmValueType.BOOLEAN;
    }

    equal(other: VmValue): boolean {
        return false;
    }
}

class ReturnAddress { constructor (public value : u32) {}}
class Frame {
    private frameValues : Map<string, VmValue> = new Map();
    private functions: Map<string, VmFunctionValue> = new Map();
    private returnAddress : ReturnAddress | null;

    constructor() {

    }

    declareFunction(name : string, value : VmFunctionValue): void {
        this.functions.set(name, value);
    }

    getFunction(name : string): VmFunctionValue {
        return this.functions.get(name);
    };

    declareVariable(name : string, value : VmValue): void {
        this.frameValues.set(name, value);
    }

    getVariable(name : string): VmValue {
        return this.frameValues.get(name);
    }

    setReturnAddress(value : u32): this {
        this.returnAddress= new ReturnAddress(value);
        return this;
    } 

    getReturnAddress(): ReturnAddress | null {
        return this.returnAddress;
    }
}

export class VM {
    private paused: boolean = false;
    private frames : Frame[] = [new Frame()]
    
    constructor(public instructions: Uint8Array, public stack: VmValue[] = new Array(1000), public ptr: i32 = 0) {
    
    }

    run(): void {
        this.debug("Running Program");
        while (!this.atEnd() && !this.paused) {
            const type = this.step();
            switch (type) {
                case ValueType.OP_CODE:
                    this.handleOpCode();
                    break;
            }
        }
    }

    handleOpCode(): void {
        const code = this.step();
        switch (code) {
            case OpCodes.PUSH:
                this.debug("PUSH");
                this.handlePush();
                break;
            case OpCodes.STORE:
                this.debug("STORE");
                this.handleStore();
                break;
            case OpCodes.LOAD:
                this.debug("LOAD");
                this.handleLoad();
                break;

            // Term
            case OpCodes.ADD:
                this.debug("ADD");
                this.handleAdd()
                break;
            case OpCodes.SUB:
                this.debug("SUB");
                this.handleSub()
                break;

            // Factor
            case OpCodes.MUL:
                this.debug("MUL");
                this.handleMul()
                break;
            case OpCodes.DIV:
                this.debug("DIV");
                this.handleDiv()
                break;

            // Compare
            case OpCodes.EQ:
                this.debug("EQ?");
                this.handleEquality();
                break;

            case OpCodes.IF:
                this.debug("IF");
                this.handleIf();
                break;
            case OpCodes.JMP:
                this.debug("JMP");
                this.handleJmp();
                break;
            case OpCodes.FUN:
                this.debug("FUN");
                this.handleFunctionDec();
                break;
            case OpCodes.FUN_END:
                this.debug("FUN_END");
                this.handleEndOfFunction();
                break;

            case OpCodes.SCOPE_START:
                this.debug("Starting Scope")
                break;
            case OpCodes.SCOPE_END:
                this.debug("Ending Scope")
                break;

            // Funcs
            case OpCodes.PRINT:
                this.debug("PRINT");
                this.handlePrint();
                break;
            case OpCodes.CALL:
                this.debug("CALL");
                this.handleCall();
                break;

            case OpCodes.EOF:
                this.debug("Fin");
                break;
        }
    }

    handlePrint(): void {
        trace("PRINTING:: " + this.stack.pop().toString());
    }

    handleCall(): void {
        this.step();
        const funcName = this.loadString();
        this.debug("Calling Func " + funcName);
        const func = this.frames[this.frames.length - 1].getFunction(funcName);
        const callFrame = new Frame().setReturnAddress(this.ptr);

        for (let index = func.varNames.length - 1; index >= 0; index--) {
            const name = func.varNames[index];
            callFrame.declareVariable(name, this.stack.pop());
        }

        this.frames.push(callFrame);
        // Last
        this.ptr = func.value;
    }

    handleAdd(): void {
        const right: VmNumberValue = <VmNumberValue>this.stack.pop();
        const left: VmNumberValue = <VmNumberValue>this.stack.pop();
        const value = left.value + right.value;
        this.debug("Pushing Value " + value.toString());
        this.stack.push(new VmNumberValue(value));
    }

    handleSub(): void {
        const right: VmNumberValue = <VmNumberValue>this.stack.pop();
        const left: VmNumberValue = <VmNumberValue>this.stack.pop();
        const value = left.value - right.value;
        this.debug("Pushing Value " + value.toString());
        this.stack.push(new VmNumberValue(value));
    }

    handleMul(): void {
        const right: VmNumberValue = <VmNumberValue>this.stack.pop();
        const left: VmNumberValue = <VmNumberValue>this.stack.pop();
        const value = left.value * right.value;
        this.debug("Pushing Value " + value.toString());
        this.stack.push(new VmNumberValue(value));
    }

    handleDiv(): void {
        const right: VmNumberValue = <VmNumberValue>this.stack.pop();
        const left: VmNumberValue = <VmNumberValue>this.stack.pop();
        const value = left.value / right.value;
        this.debug("Pushing Value " + value.toString());
        this.stack.push(new VmNumberValue(value));
    }

    handleEquality(): void {
        const right: VmValue = <VmValue>this.stack.pop();
        const left: VmValue = <VmValue>this.stack.pop();
        
        const value = right.equal(left);
        this.debug("Equality " + value.toString());
        this.stack.push(new VmBooleanValue(value));
    }

    handleIf(): void {
        const value = <VmBooleanValue>this.stack.pop()
        
        this.next();
        const afterPtr = this.loadAddress();
        this.next();
        const blockPtr = this.loadAddress();

        this.debug("blockPtr " + blockPtr.toString() + " afterPtr " + afterPtr.toString())
        
        if (value.value) {
            this.ptr = blockPtr;
        } else {
            this.ptr = afterPtr;
        }
    }

    handleJmp(): void {
        // Note, we might need to do this off the stack.
        const afterPtr = this.loadAddress();

        this.debug("Jumping to " + afterPtr.toString());
        this.ptr = afterPtr;
    }

    handleFunctionDec(): void {
        this.step();
        const name = this.loadString();
        this.step();
        const arity = this.loadAddress();

        let varNames : string[] = [];

        for (let index = 0; index < <i32>arity; index++) {
            this.step()
            varNames.push(this.loadString());
        }

        this.step();
        const blockEnd = this.loadAddress();
        this.debug("FUN Name " + name.toString() + " Arity " + arity.toString() + " block ends at " + blockEnd.toString());
        
        const func = new VmFunctionValue(this.ptr, arity, varNames);
        this.frames[this.frames.length - 1].declareFunction(name, func);

        // Move past function
        this.ptr = blockEnd;
    }

    handleEndOfFunction(): void {
        const addressMaybe = this.frames[this.frames.length - 1].getReturnAddress();
        if (addressMaybe != null) {
            this.ptr = addressMaybe.value;
        }
        this.frames.pop();
    }

    handlePush(): void {
        const type = this.step();
        switch (type) {
            case ValueType.NUMBER:
                this.debug("PUSHING NUMBER");
                this.pushNumber();
                break;
            case ValueType.STRING:
                break;
        }
    }

    handleStore(): void {
        const value = this.stack.pop();
        this.step();
        
        const name = this.loadString();
        this.debug("Declaring Var " + name + " value " + value.toString())
        this.frames[this.frames.length - 1].declareVariable(name, value);
    }

    handleLoad(): void {
        this.step();
        const name = this.loadString();
        this.stack.push(this.frames[this.frames.length - 1].getVariable(name));
    }

    loadNumber(): f64 {
        return Float64Array.wrap(this.loadN(8).buffer)[0];
    }

    loadString(): string {
        var out = '';
        const stringSize = Uint32Array.wrap(this.loadN(4).buffer)[0];
        const stringBytes = Uint16Array.wrap(this.loadN(stringSize * 2).buffer);

        for (let index = 0; index < stringBytes.length; index++) {
            out += String.fromCharCode(stringBytes[index]);
        }

        this.debug("Loaded string " + out);
        return out;
    }

    pushNumber(): void {
        // Numbers are F64
        const number = this.loadNumber();
        this.stack.push(new VmNumberValue(number));
        this.debug("Pushing Number " + number.toString())
    }

    step(): u8 {
        return <u8>this.next();
    }

    loadN(n: i32): Uint8Array {
        let out: Uint8Array = new Uint8Array(n);
        for (let index = 0; index < n; index++) {
            out[index] = this.step();
        }
        return out;
    }

    loadAddress(): u32 {
        return Uint32Array.wrap(this.loadN(4).buffer)[0];
    }

    loadStackSlot(): u32 {
        return <u32> this.loadNumber();
    }

    next(): u8 {
        const v = this.instructions[this.ptr];
        this.ptr += 1;
        return v;
    }

    peek(): u8 {
        return this.instructions[this.ptr];
    }

    peekNext(): u8 {
        if (this.atEnd()) {
            return 1000;
        }
        return this.instructions[this.ptr + 1];
    }

    atEnd(): boolean {
        return this.ptr >= this.instructions.length;
    }

    debug(v: string): void {
        trace("debug: " + v);
    }
}