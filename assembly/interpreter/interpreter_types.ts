import {
    BinaryExpr, Expr, Stmt, GroupingExpr, LiteralExpr, LogicalExpr, UnaryExpr,
    ExpressionStmt, FunctionStmt, IfStmt, WhileStmt, ReturnStmt, BlockStmt, PrintStmt, AssignExpr, VarStmt, VariableExpr, CallExpr
} from "../ast/ast_types";
import {
    LiteralTypes, Token, TokenType, ExprType, StmtType
} from "../types";
import { Interpreter } from "./interpreter";

export abstract class BaseInterpreter {
    constructor(public globals: Environment) { }

    abstract evaluateBlock(stmts: Stmt[], localScope: Environment): EvaluationResult | null;
    abstract resolve(expression: Expr, name: number): void;
}

export enum ResultType {
    NUMBER, BOOLEAN, STRING, NIL, CLASS
}

export class Environment {
    private memory: Map<string, EvaluationResult> = new Map<string, EvaluationResult>();

    constructor(public parentScope: Environment | null = null) {
    }

    debug(): void {
        let k = this.memory.keys();
        for (let index = 0; index < k.length; index++) {
            const key = k[index];
            trace("key=" + key + " value=" + this.memory.get(key).toString());
        }
    }

    isInitd(identifer: string): bool {
        return this.memory.has(identifer);
    }

    define(identifer: string, value: EvaluationResult): void {
        this.memory.set(identifer, value);
    }

    assign(identifer: string, value: EvaluationResult): void {
        // We have it
        if (this.isInitd(identifer)) {
            this.memory.set(identifer, value);
            return;
        }
        // Try parent
        if (this.parentScope != null) {
            (<Environment>this.parentScope).assign(identifer, value);
            return;
        };
    }

    get(token: Token): EvaluationResult {
        if (this.isInitd(token.lexme)) {
            return this.memory.get(token.lexme);
        }

        if (this.parentScope != null) {
            return (<Environment>this.parentScope).get(token);
        }

        return new EvaluationResult();
    }

    getAt(distance: number, token: Token): EvaluationResult {
        let env = <Environment>this;
        for (let index = 0; index < distance; index++) {
            env = <Environment>env.parentScope;
        }

        return env.get(token);
    }

    assignAt(distance: number, identifer: string, value: EvaluationResult): void {
        let env = <Environment>this;
        for (let index = 0; index < distance; index++) {
            env = <Environment>env.parentScope;
        }

        env.assign(identifer, value);
    }
}

export class EvaluationResult {
    constructor(public type: ResultType = ResultType.NIL) {

    }

    isTruthy(): boolean {
        return false;
    }

    trace(): void {
        trace("EvaluationResult nil");
    }

    toString(): string {
        return '';
    }
};

export abstract class HazldCallable extends EvaluationResult {
    constructor() {
        super();
    };
    abstract call(inter: BaseInterpreter, args: EvaluationResult[]): EvaluationResult;
    abstract arity(): u8;
}

export class HazldInstance extends EvaluationResult {
    private properties: Map<string, EvaluationResult> = new Map();

    constructor(public klass: HazldClass) {
        super();
    }

    toString(): string {
        return this.klass.toString() + ' Instance';
    }

    get(name: string): EvaluationResult {
        if (this.properties.has(name)) return this.properties.get(name);

        const funcMaybe = <HazldFunction>this.klass.findMethod(name);

        if (funcMaybe != null) return funcMaybe.bind(this);

        return new EvaluationResult(ResultType.NIL);
    }

    set(name: string, value: EvaluationResult): void {
        this.properties.set(name, value);
    }
}

export class HazldClass extends HazldCallable {
    constructor(public name: string, public methods: Map<string, HazldCallable>) {
        super();
    }

    toString(): string {
        return this.name;
    }

    call(inter: BaseInterpreter, args: EvaluationResult[]): EvaluationResult {
        const initFunc = this.findMethod("init");
        const instance = new HazldInstance(this);
        if (initFunc != null) {
            (<HazldFunction>initFunc).bind(instance).call(inter, args);
        }
        return instance;
    }

    findMethod(name: string): HazldCallable | null {
        if (this.methods.has(name)) {
            return this.methods.get(name);
        }
        return null;
    }

    arity(): u8 {
        if (!this.methods.has("init")) {
            return 0;
        }
        const initMaybe = this.methods.get("init");
        return initMaybe.arity();
    }
}

export abstract class BuiltInFunction extends HazldCallable {
    constructor(public identifier: string, public funcArity: u8) {
        super();
    }

    arity(): u8 {
        return this.funcArity;
    }
}

export class HazldFunction extends HazldCallable {
    public name: string;
    constructor(public declaration: FunctionStmt, public closure: Environment) {
        super();
        this.name = declaration.name.lexme;
    }

    arity(): u8 {
        return <u8>this.declaration.params.length
    }

    call(inter: BaseInterpreter, args: EvaluationResult[]): EvaluationResult {
        // New function scope
        const env = new Environment(this.closure);
        // Load all params
        for (let index = 0; index < this.declaration.params.length; index++) {
            const argDef = this.declaration.params[index];
            env.define(argDef.lexme, args[index]);
        }
        let valueMaybe = inter.evaluateBlock(this.declaration.body, env);
        if (valueMaybe != null) {
            return <EvaluationResult>valueMaybe;
        }
        return new EvaluationResult();
    }

    bind(inst: HazldInstance): HazldFunction {
        // Nest instance vars inside new function
        const env = new Environment(this.closure);
        env.define("this", inst);
        return new HazldFunction(this.declaration, env);
    }
}

export class NumberResult extends EvaluationResult {
    constructor(public value: f64) {
        super(ResultType.NUMBER);
    }

    isTruthy(): boolean {
        return this.value != 0;
    }

    flip(): EvaluationResult {
        this.value = this.value * -1;
        return this;
    }

    binaryOperation(op: TokenType, other: NumberResult): EvaluationResult {
        if (op == TokenType.MINUS) return new NumberResult(this.value - other.value);
        else if (op == TokenType.PLUS) return new NumberResult(this.value + other.value);
        else if (op == TokenType.STAR) return new NumberResult(this.value * other.value);
        else if (op == TokenType.SLASH) return new NumberResult(this.value / other.value);
        else if (op == TokenType.GREATER) return new BoolResult(this.value > other.value);
        else if (op == TokenType.GREATER_EQUAL) return new BoolResult(this.value >= other.value);
        else if (op == TokenType.LESS) return new BoolResult(this.value < other.value);
        else if (op == TokenType.LESS_EQUAL) return new BoolResult(this.value <= other.value);
        else if (op == TokenType.BANG_EQUAL) return new BoolResult(this.value != other.value);
        else if (op == TokenType.EQUAL_EQUAL) return new BoolResult(this.value == other.value);
        trace("Panic! Unsupported operation in NumberResult Binary Op " + op);
        return new EvaluationResult();
    }

    toString(): string {
        return 'NumberResult ' + this.value.toString();
    }

    trace(): void {
        trace(this.toString())
    }
}

export class BoolResult extends EvaluationResult {
    constructor(public value: boolean) {
        super(ResultType.BOOLEAN);
    }

    isTruthy(): boolean {
        return this.value;
    }

    binaryOperation(op: TokenType, other: BoolResult): EvaluationResult {
        trace("Panic! Unsupported operation in BinaryExpr Binary Op " + op);
        return new EvaluationResult();
    }

    toString(): string {
        return 'BoolResult ' + this.value.toString();
    }

    trace(): void {
        trace(this.toString())
    }
}

export class StringResult extends EvaluationResult {
    constructor(public value: string) {
        super(ResultType.STRING);
    }

    isTruthy(): boolean {
        "foo"
        return this.value.length > 0;
    }

    binaryOperation(op: TokenType, other: StringResult): EvaluationResult {
        if (op == TokenType.PLUS) return new StringResult(this.value + other.value);
        else if (op == TokenType.GREATER) return new BoolResult(this.value.length > other.value.length);
        else if (op == TokenType.GREATER_EQUAL) return new BoolResult(this.value.length >= other.value.length);
        else if (op == TokenType.LESS) return new BoolResult(this.value < other.value);
        else if (op == TokenType.LESS_EQUAL) return new BoolResult(this.value.length <= other.value.length);
        else if (op == TokenType.BANG_EQUAL) return new BoolResult(this.value != other.value);
        else if (op == TokenType.EQUAL_EQUAL) return new BoolResult(this.value == other.value);
        trace("Panic! Unsupported operation in NumberResult Binary Op " + op);
        return new EvaluationResult();
    }

    toString(): string {
        return 'StringResult ' + this.value.toString();
    }

    trace(): void {
        trace(this.toString())
    }
}