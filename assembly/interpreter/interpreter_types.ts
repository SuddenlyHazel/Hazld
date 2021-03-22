import {
    BinaryExpr, Expr, Stmt, GroupingExpr, LiteralExpr, LogicalExpr, UnaryExpr,
    ExpressionStmt, FunctionStmt, IfStmt, WhileStmt, ReturnStmt, BlockStmt, PrintStmt, AssignExpr, VarStmt, VariableExpr, CallExpr
} from "../ast/ast_types";
import {
    LiteralTypes, Token, TokenType, ExprType, StmtType
} from "../types";
import { Interpreter } from "./interpreter";

export abstract class BaseInterpreter {
    constructor(public globals : Environment) {}

    abstract evaluateBlock(stmts: Stmt[], localScope: Environment): EvaluationResult | null;
}

export enum ResultType {
    NUMBER, BOOLEAN, STRING, NIL,
}

export class Environment {
    private memory: Map<string, EvaluationResult> = new Map<string, EvaluationResult>();

    constructor(public parentScope: Environment | null = null) {
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
    constructor(public arity: u8) {
        super();
    };
    abstract call(inter: BaseInterpreter, args: EvaluationResult[]): EvaluationResult;
}

export abstract class BuiltInFunction extends HazldCallable {
    constructor(public identifier: string, arity: u8) {
        super(arity);
    }
}

export class HazldFunction extends HazldCallable {
    public name : string;
    constructor(public declaration: FunctionStmt, public closure: Environment) {
        super(<u8>declaration.params.length);
        this.name = declaration.name.lexme;
    }

    call(inter: BaseInterpreter, args: EvaluationResult[]) : EvaluationResult {
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