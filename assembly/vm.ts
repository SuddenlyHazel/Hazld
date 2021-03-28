import { OpCodes, ValueType } from "../shared/vm_types";

enum VmValueType {
    NIL,
    NUMBER,
    BOOLEAN
}

abstract class VmValue {
    abstract toString(): string;
    abstract getType(): VmValueType;
    abstract equal(other: VmValue): boolean;
};

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
        return VmValueType.BOOLEAN;
    }

    equal(other: VmValue): boolean {
        switch (other.getType()) {
            case VmValueType.BOOLEAN:
                return (<VmBooleanValue>other).value == this.value;
        }
        return false;
    }
}
class Frame {
    private frameValues : VmValue[] = [];
    constructor() {

    }
    push(value : VmValue): void {
        this.frameValues.push(value);
    }

    get(value : u32): VmValue {
        return this.frameValues[value]
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

            case OpCodes.EOF:
                this.debug("Fin");
                break;
        }
    }

    handlePrint(): void {
        trace("PRINTING:: " + this.stack.pop().toString());
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

        const blockPtr = this.loadAddress();
        const afterPtr = this.loadAddress();

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
        this.frames[this.frames.length - 1].push(this.stack.pop())
    }

    handleLoad(): void {
        const slot = this.loadStackSlot();
        this.stack.push(this.frames[this.frames.length - 1].get(slot));
    }

    loadNumber(): f64 {
        return Float64Array.wrap(this.loadN(8).buffer)[0];
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