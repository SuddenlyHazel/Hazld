import { TokenType, ExprType, StmtType, Token } from "../types";

export abstract class Visitor {
    abstract visitAssignExpr(v: AssignExpr): string;
    abstract visitBinaryExpr(v: BinaryExpr): string;
    abstract visitCallExpr(v: CallExpr): string;
    abstract visitGetExpr(v: GetExpr): string;
    abstract visitGroupingExpr(v: GroupingExpr): string;
    abstract visitLiteralExpr<T>(v: LiteralExpr<T>, value : string): string;
    abstract visitLogicalExpr(v: LogicalExpr): string;
    abstract visitSetExpr(v: SetExpr): string;
    abstract visitSuperExpr(v: SuperExpr): string;
    abstract visitThisExpr(v: ThisExpr): string;
    abstract visitUnaryExpr(v: UnaryExpr): string;
    abstract visitVariableExpr(v: VariableExpr): string;
}

export class ExprWrapper {
}

export abstract class Expr {
    constructor(public type: ExprType) {
    }

    abstract accept(v : Visitor) : string;
    abstract toString() : string;

    getMetadata() : string[] | null {
        return null;
    }
}

export class Stmt {
    constructor(public type: StmtType) { }
    toString(): string {
        return '';
    }
}

export class BinaryExpr extends Expr {
    constructor(public left: Expr, public operator: TokenType, public right: Expr) {
        super(ExprType.BinaryExpr);
    };

    accept(visitor: Visitor): string {
        return visitor.visitBinaryExpr(this);
    }

    toString(): string {
        return this.type.toString() + ' (Left ' + this.left.toString() + ') (Right ' + this.right.toString() + ') op ' + this.operator.toString();
    }
}

export class GroupingExpr extends Expr {
    constructor(public expression: Expr) {
        super(ExprType.GroupingExpr)
    }

    accept(visitor: Visitor): string {
        return visitor.visitGroupingExpr(this);
    }
    
    toString() : string {
        return 'GroupingExpression ' + this.expression.toString();
    }
}

export class CallExpr extends Expr {
    constructor(public callee: Expr, public paren: Token, public argument: Expr[]) {
        super(ExprType.CallExpr)
    }

    accept(visitor: Visitor): string {
        return visitor.visitCallExpr(this);
    }

    toString() : string {
        return 'CallExpr'
    }
}

export class LiteralExpr<T> extends Expr {
    constructor(public value: T, public stringValue : string) {
        super(ExprType.LiteralExpr);
    }

    accept(visitor: Visitor): string {
        return visitor.visitLiteralExpr<T>(this, this.stringValue + typeof(this.value));
    }

    toString() : string {
        return 'LiteralExprs ' + this.stringValue
    }
    
    getMetadata() : string[] | null {
        return [typeof(this.value)];
    }
}

export class LogicalExpr extends Expr {
    constructor(public left: Expr, public operator: Token, public right: Expr) {
        super(ExprType.LogicalExpr)
    }

    accept(visitor: Visitor): string {
        return visitor.visitLogicalExpr(this);
    }

    toString() : string {
        return 'LogicalExpr'
    }
}

export class UnaryExpr extends Expr {
    constructor(public operator: TokenType, public right: Expr) {
        super(ExprType.UnaryExpr)
    }

    accept(visitor: Visitor): string {
        return visitor.visitUnaryExpr(this);
    }

    toString() : string {
        return 'UnaryExpr'
    }
}

// Lookup
export class VariableExpr extends Expr {
    constructor(public name: Token) {
        super(ExprType.VariableExpr)
    }

    accept(visitor: Visitor): string {
        return visitor.visitVariableExpr(this);
    }

    toString() : string {
        return 'VariableExpr'
    }
}

// Assignment
export class AssignExpr extends Expr {
    constructor(public name: Token, public value: Expr) {
        super(ExprType.AssignExpr)
    }

    accept(visitor: Visitor): string {
        return visitor.visitAssignExpr(this);
    }

    toString() : string {
        return 'AssignExpr'
    }
}

export class GetExpr extends Expr {
    constructor(public name: Token, public object: Expr) {
        super(ExprType.GetExpr)
    }

    accept(visitor: Visitor): string {
        return visitor.visitGetExpr(this);
    }

    toString() : string {
        return 'GetExpr'
    }
}

export class SetExpr extends Expr {
    constructor(public object: Expr, public name: Token, public value: Expr) {
        super(ExprType.SetExpr)
    }

    accept(visitor: Visitor): string {
        return visitor.visitSetExpr(this);
    }

    toString() : string {
        return 'SetExpr'
    }
}

export class ThisExpr extends Expr {
    constructor(public keyword: Token) {
        super(ExprType.ThisExpr)
    }

    accept(visitor: Visitor): string {
        return visitor.visitThisExpr(this);
    }

    toString() : string {
        return 'ThisExpr'
    }
}

export class SuperExpr extends Expr {
    constructor(public keyword: TokenType, public method: TokenType) {
        super(ExprType.SuperExpr)
    }

    accept(visitor: Visitor): string {
        return visitor.visitSuperExpr(this);
    }

    toString() : string {
        return 'SuperExpr'
    }
}

export class ExpressionStmt extends Stmt {
    constructor(public expression: Expr) {
        super(StmtType.ExpressionStmt)
    }

    toString(): string {
        return 'ExpressionStmt';
    }
}

export class PrintStmt extends Stmt {
    constructor(public expression: Expr) {
        super(StmtType.PrintStmt)
    }

    toString(): string {
        return 'PrintStmt';
    }
}

export class VarStmt extends Stmt {
    constructor(public name: Token, public initializer: Expr | null) {
        super(StmtType.VarStmt)
    }

    toString(): string {
        return 'VarStmt';
    }
}

export class VarExpressionStmt extends Stmt {
    constructor(public name: Token, public body: BlockStmt) {
        super(StmtType.VarExpressionStmt)
    }

    toString(): string {
        return 'VarExpressionStmt';
    }
}

export class BlockStmt extends Stmt {
    constructor(public statements: Stmt[]) {
        super(StmtType.BlockStmt)
    }

    toString(): string {
        return 'BlockStmt';
    }
}

export class ClassStmt extends Stmt {
    constructor(public name: Token, public superclass: VariableExpr | null, public methods: FunctionStmt[]) {
        super(StmtType.ClassStmt)
    }

    toString(): string {
        return 'ClassStmt';
    }
}

export class IfStmt extends Stmt {
    constructor(public condition: Expr, public thenBranch: Stmt, public elseBranch: Stmt | null) {
        super(StmtType.IfStmt)
    }

    toString(): string {
        return 'IfStmt';
    }
}

export class WhileStmt extends Stmt {
    constructor(public condition: Expr, public body: Stmt) {
        super(StmtType.WhileStmt)
    }

    toString(): string {
        return 'WhileStmt';
    }
}

export class FunctionStmt extends Stmt {
    constructor(public name: Token, public params: Token[], public body: Stmt[]) {
        super(StmtType.FunctionStmt)
    }

    toString(): string {
        return 'FunctionStmt';
    }
}

export class ReturnStmt extends Stmt {
    constructor(public keyword: Token, public value: Expr | null) {
        super(StmtType.ReturnStmt)
    }

    toString(): string {
        return 'ReturnStmt';
    }
}