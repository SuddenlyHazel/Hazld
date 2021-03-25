export enum ValueType {
    STRING, NUMBER, BOOLEAN, OPCODE
}

export abstract class VMValue {
    constructor(public type : ValueType) {}
    toString(): string {
        return '';
    }
}

export class StringValue extends VMValue {
    constructor(public value : string) {
        super(ValueType.STRING);
    }
    toString(): string {
        return this.value;
    }
};

export class NumberValue extends VMValue {
    constructor(public value : number) {
        super(ValueType.NUMBER);
    }

    toString(): string {
        return this.value.toString();
    }
};

export class BooleanValue extends VMValue {
    constructor(public value : boolean) {
        super(ValueType.BOOLEAN);
    }

    toString(): string {
        return this.value.toString();
    }
};

export class OpcodeValue extends VMValue {
    constructor(public value : OpCodeType) {
        super(ValueType.OPCODE);
    }

    toString(): string {
        return this.value.toString();
    }
};

export class Frame {
    constructor(public returnAddress: i64) {}
}

export enum OpCodeType {
    PUSH, POP, 
    
    STORE, LOAD,
    
    BINARY_OP,
    ADD, SUBTRACT,

    CALL, JUMP, RET,

    PRINT,
    
    EOF
}

export class VM {
    private variables: Map<String, VMValue> = new Map();
    private frames: Frame[] = [];
    constructor(public instructions: VMValue[], public stack: VMValue[], public ptr: i32) {

    }

    run(): void {
        this.debug("Running Program");
        while(!this.atEnd()) {
            this.step();
        }
    }

    step(): void {
        this.debug("Stepping!")
        const instruction = <OpcodeValue>this.next();
        switch(instruction.value) {
            case OpCodeType.PUSH:
                this.pushValue();
                break;
            case OpCodeType.POP:
                this.popValue();
                break;
            case OpCodeType.BINARY_OP:
                this.binaryOperation();
                break;
            case OpCodeType.PRINT:
                this.printOperation();
                break;
            case OpCodeType.STORE:
                this.storeOperation();
                break;
            case OpCodeType.LOAD:
                this.loadOperation();
                break;
            case OpCodeType.JUMP:
                this.jumpOperation();
                break;
        }
    }

    callOperation(): void {
        this.frames.push(new Frame(this.ptr));
        this.ptr = (<NumberValue>this.next()).value;
    }

    jumpOperation(): void {
        const value = <NumberValue>this.popValue();
        this.ptr = value.value;
    }

    storeOperation(): void {
        const identifier = <StringValue>this.popValue();
        const value = this.popValue();
        this.variables.set(identifier.value, value);
    }

    loadOperation(): void {
        const identifier = <StringValue>this.popValue();
        const value = this.variables.get(identifier.value);
        this.stack.push(value);
    }

    printOperation(): void {
        const v = this.popValue();
        trace(v.toString());
    }

    binaryOperation(): void {
        const binaryOp = <OpcodeValue>this.next();
        const left = this.popValue();
        const right = this.popValue();
    }

    pushValue(): void {
        this.debug("Pushing Value");
        const value = this.next();
        this.stack.push(value);
    }

    popValue(): VMValue {
        this.debug("Pop Value");
        return this.stack.pop();
    }

    next(): VMValue {
        const v = this.instructions[this.ptr];
        this.ptr += 1;
        return v;
    }

    peek(): VMValue {
        return this.instructions[this.ptr];
    }

    peekNext(): VMValue | null {
        if (this.atEnd()) {
            return null;
        }
        return this.instructions[this.ptr + 1];
    }

    atEnd(): boolean {
        return this.ptr >= this.instructions.length;
    }

    debug(v : string): void {
        trace("debug: " + v);
    }
}