import {
    BinaryExpr, Expr, Stmt, GroupingExpr, LiteralExpr, LogicalExpr, UnaryExpr,
    ExpressionStmt, FunctionStmt, IfStmt, WhileStmt, ReturnStmt, BlockStmt, PrintStmt, AssignExpr, VarStmt, VariableExpr, CallExpr
} from "../ast/ast_types";
import {
    LiteralTypes, Token, TokenType, ExprType, StmtType
} from "../types";

export abstract class BaseInterpreter {

}

export enum ResultType {
    NUMBER, BOOLEAN, STRING, NIL,
}

export abstract class HazldCallable {
    constructor(public arity : u8) {};
    abstract call(inter : BaseInterpreter, args : EvaluationResult[]) : EvaluationResult;
}

export class Environment {    
    private memory : Map<string, EvaluationResult> = new Map<string, EvaluationResult>(); 
    
    constructor(public parentScope : Environment | null = null) {
    }

    isInitd(identifer: string): bool {
        return this.memory.has(identifer);
    }

    define(identifer: string, value: EvaluationResult): void {
        this.memory.set(identifer, value);
    }

    assign(identifer: string, value : EvaluationResult): void {
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

        trace("Variable not in scope...")
    }

    get(token : Token) : EvaluationResult {
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

export class NumberResult extends EvaluationResult {
    constructor(public value: f64) {
        super(ResultType.NUMBER);
        this.trace();
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