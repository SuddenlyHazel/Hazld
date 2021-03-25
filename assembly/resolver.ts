import { AssignExpr, BinaryExpr, BlockStmt, CallExpr, ClassStmt, Expr, ExpressionStmt, FunctionStmt, GetExpr, GroupingExpr, IfStmt, LogicalExpr, PrintStmt, ReturnStmt, SetExpr, Stmt, ThisExpr, UnaryExpr, VarExpressionStmt, VariableExpr, VarStmt, WhileStmt } from "./ast/ast_types";
import { BaseInterpreter } from "./interpreter/interpreter_types";
import { ExprType, StmtType } from "./types";

enum FunctionType {
    NONE,
    FUNCTION,
    METHOD,
    INITIALIZER
}

enum ClassType {
    NONE, CLASS,
}

export class Resolver {
    scopes: Map<string, boolean>[] = [];
    currentClass : ClassType = ClassType.NONE;
    functionType : FunctionType = FunctionType.NONE;

    constructor(public interpreter: BaseInterpreter, public isDebug: boolean = false) {
    }

    // All statements for a prog
    resolveStmts(stmts: Stmt[]): void {
        this.debug("Resolving Statement Array");
        for (let index = 0; index < stmts.length; index++) {
            this.resolveStmt(stmts[index]);
        }
    }

    // Process a single statement
    resolveStmt(stmt: Stmt): void {
        this.debug("Checking Next Stmt " + stmt.toString());
        switch (stmt.type) {
            case (StmtType.BlockStmt):
                this.resolveBlockStmt(<BlockStmt>stmt);
                break;
            case (StmtType.ExpressionStmt):
                this.resolveExpressionStmt(<ExpressionStmt>stmt);
                break;
            case (StmtType.FunctionStmt):
                this.resolveFunctionStmt(<FunctionStmt>stmt);
                break;
            case (StmtType.IfStmt):
                this.resolveIfStmt(<IfStmt>stmt);
                break;
            case (StmtType.PrintStmt):
                this.resolvePrintStmt(<PrintStmt>stmt);
                break;
            case (StmtType.ReturnStmt):
                this.resolveReturnStmt(<ReturnStmt>stmt);
                break;
            case (StmtType.VarExpressionStmt):
                this.resolveVariableExpressionStmt(<VarExpressionStmt>stmt);
                break;
            case (StmtType.VarStmt):
                this.resolveVarStmt(<VarStmt>stmt);
                break;
            case (StmtType.WhileStmt):
                this.resolveWhileStmt(<WhileStmt>stmt);
                break;
            case (StmtType.ClassStmt):
                this.resolveClassStmt(<ClassStmt>stmt);
                break;
        }
    }

    resolveBlockStmt(blockStmt: BlockStmt): void {
        this.beginScope();
        this.debug("Resolving Block");
        this.resolveStmts(blockStmt.statements);
        this.endScope();
    }

    resolveVarStmt(varStmt: VarStmt): void {
        this.debug("Resolving Variable Stmt")
        this.declare(varStmt.name.lexme);
        if (varStmt.initializer != null) {
            this.resolveExpr(<Expr>varStmt.initializer)
        }
        this.define(varStmt.name.lexme);
    }

    resolveExpressionStmt(stmt: ExpressionStmt): void {
        this.resolveExpr(stmt.expression);
    }

    resolveVariableExpressionStmt(stmt: VarExpressionStmt): void {
        this.resolveBlockStmt(stmt.body);
    }

    resolveIfStmt(stmt: IfStmt): void {
        this.resolveExpr(stmt.condition);
        this.resolveStmt(stmt.thenBranch);
        if (stmt.elseBranch != null) this.resolveStmt(<Stmt>stmt.elseBranch)
    }

    resolvePrintStmt(stmt: PrintStmt): void {
        this.resolveExpr(stmt.expression);
    }

    resolveReturnStmt(stmt: ReturnStmt): void {
        if (stmt.value == null) {
            return;
        } else if (this.functionType == FunctionType.INITIALIZER) {
            // Hzl TODO Explode if trying to return a value from init.
            return;
        }

        this.resolveExpr(<Expr>stmt.value);
    }

    resolveWhileStmt(stmt: WhileStmt): void {
        this.resolveExpr(stmt.condition);
        this.resolveStmt(stmt.body);
    }

    resolveClassStmt(stmt: ClassStmt): void {
        const enclosingClass = this.currentClass;
        this.currentClass = ClassType.CLASS;

        this.declare(stmt.name.lexme);
        this.define(stmt.name.lexme);


        // Scope Methods
        this.beginScope();
        this.peekScope().set("this", true); // this is valid within class
        for (let index = 0; index < stmt.methods.length; index++) {
            const methodDec = stmt.methods[index];
            this.functionType = methodDec.name.lexme == "init" ? FunctionType.INITIALIZER : FunctionType.METHOD
            this.resolveFunctionOrMethod(methodDec, this.functionType);
        }
        this.endScope();

        // Scope Static Methods
        this.beginScope();
        for (let index = 0; index < stmt.staticMethods.length; index++) {
            const methodDec = stmt.staticMethods[index];
            this.resolveFunctionOrMethod(methodDec, this.functionType);
        }
        this.endScope();

        this.currentClass = enclosingClass;
    };

    resolveFunctionStmt(stmt: FunctionStmt): void {
        this.declare(stmt.name.lexme);
        this.define(stmt.name.lexme);
        this.functionType = FunctionType.FUNCTION;
        this.resolveFunctionOrMethod(stmt, this.functionType);
    }

    // Helper for Function and Methods
    resolveFunctionOrMethod(func: FunctionStmt, type: FunctionType): void {
        this.beginScope();
        for (let index = 0; index < func.params.length; index++) {
            const param = func.params[index];
            this.declare(param.lexme);
            this.define(param.lexme);
        }
        this.resolveStmts(func.body);
        this.endScope();
    }

    // Expressions

    // Delegates depending on expression type
    resolveExpr(expr: Expr): void {
        switch(expr.type) {
            case ExprType.AssignExpr:
                this.resolveAssignExpr(<AssignExpr>expr);
                break;
            case ExprType.BinaryExpr:
                this.resolveBinaryExpr(<BinaryExpr>expr);
                break;
            case ExprType.CallExpr:
                this.resolveCallExpr(<CallExpr>expr);
                break;
            case ExprType.GetExpr:
                this.resolveGetExpr(<GetExpr>expr);
                break;
            case ExprType.GroupingExpr:
                this.resolveGroupingExpr(<GroupingExpr>expr);
                break;
            case ExprType.LiteralExpr:
                break; // Nothing todo
            case ExprType.LogicalExpr:
                this.resolveLogicalExpr(<LogicalExpr>expr);
                break;
            case ExprType.SetExpr:
                this.resolveSetExpr(<SetExpr>expr);
                break;
            case ExprType.SuperExpr:
                this.debug("NYI");
                break;
            case ExprType.ThisExpr:
                this.resolveThisExpr(<ThisExpr>expr);
                break;
            case ExprType.UnaryExpr:
                this.resolveUnaryExpr(<UnaryExpr>expr);
                break;
            case ExprType.VariableExpr:
                this.resolveVariableExpr(<VariableExpr>expr);
                break;
        }
    }

    resolveVariableExpr(expr: VariableExpr): void {
        this.debug("Resolving Variable Expr")
        if (!this.isScopesEmpty() && !this.isVarNull && this.isVarInitialized(expr.name.lexme) == false) {
            trace("Can't ref var in own initializer")
        }
        this.resolveLocal(expr, expr.name.lexme);
    }

    resolveAssignExpr(expr: AssignExpr): void {
        this.debug("Resolving Assign Expr")
        this.resolveExpr(expr.value);
        this.resolveLocal(expr, expr.name.lexme);
    }

    resolveBinaryExpr(expr: BinaryExpr): void {
        this.debug("Resolving Binary Expr")
        this.resolveExpr(expr.left);
        this.resolveExpr(expr.right);
    }

    resolveCallExpr(expr: CallExpr): void {
        this.debug("Resolving Call Expr")
        this.resolveExpr(expr.callee);

        for (let index = 0; index < expr.argument.length; index++) {
            const arg = expr.argument[index];
            this.resolveExpr(arg);
        }
    }

    resolveGetExpr(expr: GetExpr): void {
        this.resolveExpr(expr.object);
    };

    resolveGroupingExpr(expr: GroupingExpr): void {
        this.debug("Resolving Grouping Expr")
        this.resolveExpr(expr.expression);
    }

    resolveLogicalExpr(expr: LogicalExpr): void {
        this.debug("Resolving Local Expr")
        this.resolveExpr(expr.left);
        this.resolveExpr(expr.right);
    }

    resolveSetExpr(expr: SetExpr): void {
        this.resolveExpr(expr.value);
        this.resolveExpr(expr.object);
    }

    resolveThisExpr(expr: ThisExpr): void {
        if (this.currentClass == ClassType.NONE) {
            return;
        }
        this.resolveLocal(expr, expr.keyword.lexme);
    }

    resolveUnaryExpr(expr: UnaryExpr): void {
        this.debug("Resolving Unary Expr")
        this.resolveExpr(expr.right);
    }

    // Resolve variable being assigned to
    resolveLocal(expr: Expr, name: string): void {
        this.debug("Resolving Local")
        for (let index = this.scopes.length - 1; index >= 0; index--) {
            const scope = this.scopes[index];
            if (scope.has(name)) {
                this.interpreter.resolve(expr, this.scopes.length - 1 - index);
            }
        }
    }

    declare(name: string): void {
        this.debug("Declaring Variable Name " + name)
        if (this.isScopesEmpty()) return;
        const scope = this.peekScope();
        scope.set(name, false);
    }

    define(name: string): void {
        this.debug("Defining Variable Name " + name)
        if (this.isScopesEmpty()) return;
        this.peekScope().set(name, true);
    }

    isScopesEmpty(): boolean {
        return this.scopes.length == 0;
    }

    peekScope(): Map<string, boolean> {
        return this.scopes[this.scopes.length - 1];
    }

    isVarNull(name: string): boolean {
        return !this.peekScope().has(name)
    }

    isVarInitialized(name: string): boolean {
        return <boolean>this.peekScope().get(name);
    }

    beginScope(): void {
        this.scopes.push(new Map());
    }

    endScope(): void {
        this.scopes.pop();
    }

    debug(line: string): void {
        if (this.isDebug) trace(line);
    }
}