import {
    BinaryExpr, Expr, Stmt, GroupingExpr, LiteralExpr, LogicalExpr, UnaryExpr,
    ExpressionStmt, FunctionStmt, IfStmt, WhileStmt, ReturnStmt, BlockStmt, PrintStmt, AssignExpr, VarStmt, VariableExpr, CallExpr, VarExpressionStmt, ClassStmt, GetExpr, SetExpr, ThisExpr
} from "../ast/ast_types";
import {
    LiteralTypes, Token, TokenType, ExprType, StmtType
} from "../types";
import { Environment, BaseInterpreter, HazldCallable, EvaluationResult, NumberResult, StringResult, BoolResult, ResultType, HazldFunction, HazldClass, HazldInstance } from "./interpreter_types";

import { foo } from "./builtins/index";

export class Interpreter extends BaseInterpreter {
    // Stash built-ins,
    private locals: Map<Expr, number> = new Map();
    private environment: Environment;

    constructor() {
        super(new Environment());
        this.globals.define(foo.identifier, foo);

        this.environment = this.globals;
    }

    interpret(statements: Stmt[]): void {
        for (let index = 0; index < statements.length; index++) {
            const statement = statements[index];
            this.evaluateStatement(statement);
        }
    }

    evaluateStatement(stmt: Stmt): EvaluationResult | null {
        let result: EvaluationResult | null = null;
        switch (stmt.type) {
            case StmtType.ExpressionStmt:
                this.evaluate((<ExpressionStmt>(stmt)).expression);
                break;
            case StmtType.PrintStmt:
                this.printStmt(<PrintStmt>(stmt));
                break;
            case StmtType.VarStmt:
                this.varStmt(<VarStmt>stmt);
                break;
            case StmtType.VarExpressionStmt:
                result = this.evaluateVarExpression(<VarExpressionStmt>stmt);
                break;
            case StmtType.BlockStmt:
                result = this.evaluateBlock((<BlockStmt>stmt).statements, new Environment(this.environment))
                break;
            case StmtType.IfStmt:
                result = this.ifStmt(<IfStmt>stmt);
                break;
            case StmtType.WhileStmt:
                result = this.whileStmt(<WhileStmt>(stmt));
                break;
            case StmtType.FunctionStmt:
                this.functionStmt(<FunctionStmt>stmt);
                break;
            case StmtType.ReturnStmt:
                result = this.returnStmt(<ReturnStmt>(stmt));
                break;
            case StmtType.ClassStmt:
                result = this.classStmt(<ClassStmt>stmt);
                break;
        }
        return result;
    }

    evaluate(expr: Expr): EvaluationResult {
        switch (expr.type) {
            case ExprType.LiteralExpr:
                return this.handleLiteral(expr);
            case ExprType.LogicalExpr:
                return this.handleLogical(<LogicalExpr>expr);
            case ExprType.GroupingExpr:
                return this.evaluate((<GroupingExpr>(expr)).expression);
            case ExprType.UnaryExpr:
                return this.handleUnary(<UnaryExpr>(expr));
            case ExprType.BinaryExpr:
                return this.handleBinary(<BinaryExpr>(expr));
            case ExprType.AssignExpr:
                return this.handleAssign(<AssignExpr>(expr));
            case ExprType.VariableExpr:
                return this.handleVariable(<VariableExpr>expr);
            case ExprType.CallExpr:
                return this.handleCall(<CallExpr>expr);
            case ExprType.GetExpr:
                return this.handleGet(<GetExpr>expr);
            case ExprType.SetExpr:
                return this.handleSet(<SetExpr>expr);
            case ExprType.ThisExpr:
                return this.handleThis(<ThisExpr>expr);
        }
        return new EvaluationResult();
    }
    // Init var!
    varStmt(stmt: VarStmt): void {
        if (stmt.initializer != null) {
            const val = this.evaluate(<Expr>stmt.initializer);
            this.environment.define(stmt.name.lexme, val);
        }
    }

    evaluateVarExpression(stmt: VarExpressionStmt): EvaluationResult | null {
        let result = this.evaluateBlock(stmt.body.statements, new Environment(this.environment));
        if (result == null) {
            trace("Panic! No result returned from variable expression body");
        };
        this.environment.define(stmt.name.lexme, <EvaluationResult>result);
        return result;
    };

    evaluateBlock(stmts: Stmt[], localScope: Environment): EvaluationResult | null {
        var result: EvaluationResult | null = null;
        const previousEnv = this.environment;
        this.environment = localScope;
        for (let index = 0; index < stmts.length; index++) {
            const statement = stmts[index];
            const resultMaybe = this.evaluateStatement(statement);
            if (resultMaybe != null) {
                result = <EvaluationResult>resultMaybe;
                break;
            }
        };
        this.environment = previousEnv;
        return result;
    };

    printStmt(stmt: PrintStmt): void {
        // Hazel TODO make this better
        trace("Print is: " + this.evaluate(stmt.expression).toString());
    }

    ifStmt(stmt: IfStmt): EvaluationResult | null {
        if (this.isTruthy(this.evaluate(stmt.condition))) {
            return this.evaluateStatement(stmt.thenBranch);
        } else if (stmt.elseBranch != null) {
            return this.evaluateStatement(<Stmt>stmt.elseBranch);
        }
        return null;
    }

    whileStmt(stmt: WhileStmt): EvaluationResult | null {
        while (this.isTruthy(this.evaluate(stmt.condition))) {
            const valueMaybe = this.evaluateStatement(stmt.body);
            if (valueMaybe != null) {
                return valueMaybe
            }
        }
        return null;
    }

    functionStmt(stmt: FunctionStmt): void {
        let func = new HazldFunction(stmt, this.environment, false);
        this.environment.define(stmt.name.lexme, func);
    };

    returnStmt(stmt: ReturnStmt): EvaluationResult | null {
        if (stmt.value != null) {
            return this.evaluate(<Expr>stmt.value)
        }
        return new EvaluationResult();
    };

    classStmt(stmt: ClassStmt): EvaluationResult | null {
        this.environment.define(stmt.name.lexme, new EvaluationResult());

        const methods: Map<string, HazldCallable> = new Map();
        for (let index = 0; index < stmt.methods.length; index++) {
            const method = stmt.methods[index];
            methods.set(method.name.lexme, new HazldFunction(method, this.environment, method.name.lexme == "init"));
        }

        const staticMethods: Map<string, HazldCallable> = new Map();
        for (let index = 0; index < stmt.staticMethods.length; index++) {
            const staticMethod = stmt.staticMethods[index];
            staticMethods.set(staticMethod.name.lexme, new HazldFunction(staticMethod, this.environment, staticMethod.name.lexme == "init"));
        }

        this.environment.assign(stmt.name.lexme, new HazldClass(stmt.name.lexme, methods, staticMethods));
        return null;
    }

    isTruthy(expr: EvaluationResult): boolean {
        return expr.isTruthy();
    };

    handleCall(expr: CallExpr): EvaluationResult {
        trace(expr.callee.toString());
        const calleeMaybe = this.evaluate(expr.callee);

        const args: EvaluationResult[] = [];
        for (let index = 0; index < expr.argument.length; index++) {
            args.push(this.evaluate(expr.argument[index]));
        }

        if (!(calleeMaybe instanceof HazldCallable)) {
            trace(calleeMaybe.toString())
            trace("Can only call functions and methods!")
            return new EvaluationResult();
        }

        const callee: HazldCallable = <HazldCallable>calleeMaybe;
        if (args.length != callee.arity()) {
            trace("Caller did not provide correct number of arguments!")
            return new EvaluationResult();
        }

        return (<HazldCallable>callee).call(this, args);
    };

    handleGet(expr: GetExpr): EvaluationResult {
        const objectMaybe = this.evaluate(expr.object);

        if (objectMaybe instanceof HazldInstance) {
            return (<HazldInstance>objectMaybe).get(expr.name.lexme);
        }
        
        if (objectMaybe instanceof HazldClass) {
            return (<HazldClass>objectMaybe).get(expr.name.lexme);
        }

        trace("PANIC! Only instances have properties");
        return new EvaluationResult();
    };

    handleThis(expr: ThisExpr): EvaluationResult {
        return this.lookupVariable(expr, expr.keyword);
    }

    handleSet(expr: SetExpr): EvaluationResult {
        const objectMaybe = this.evaluate(expr.object);
        if (!(objectMaybe instanceof HazldInstance)) {
            trace("PANIC! Only instances have fields");
            return new EvaluationResult();
        }
        const value = this.evaluate(expr.value);
        (<HazldInstance>objectMaybe).set(expr.name.lexme, value);
        return value;
    }

    handleVariable(expr: VariableExpr): EvaluationResult {
        return this.lookupVariable(expr, expr.name);
    }

    lookupVariable(expr: Expr, token: Token): EvaluationResult {
        if (!this.locals.has(expr)) {
            return this.globals.get(token);
        }
        return this.environment.getAt(this.locals.get(expr), token);
    }

    handleLogical(expr: LogicalExpr): EvaluationResult {
        const left = this.evaluate(expr.left);
        if (expr.operator.type == TokenType.OR) {
            if (this.isTruthy(left)) return left;
        } else {
            if (!this.isTruthy(left)) return left;
        }
        return this.evaluate(expr.right);
    };

    handleUnary(expr: UnaryExpr): EvaluationResult {
        const right = this.evaluate(expr.right);

        if (expr.operator == TokenType.BANG) {
            return new BoolResult(!this.isTruthy(right))

        } else if (expr.operator == TokenType.MINUS) {
            // Hazel TODO CHeck actually can op!
            return (<NumberResult>(right)).flip();
        }
        trace("PANIC!! handleUnary " + expr.operator)
        return new EvaluationResult();
    }

    handleBinary(expr: BinaryExpr): EvaluationResult {
        const left = this.evaluate(expr.left);
        const right = this.evaluate(expr.right);
        if (left.type != right.type) {
            return new EvaluationResult();
        }

        switch (left.type) {
            case ResultType.NUMBER: return (<NumberResult>(left)).binaryOperation(expr.operator, <NumberResult>right);
            case ResultType.BOOLEAN: return (<BoolResult>(left)).binaryOperation(expr.operator, <BoolResult>right);
            case ResultType.STRING: return (<StringResult>(left)).binaryOperation(expr.operator, <StringResult>right);
        };
        return new EvaluationResult();
    }

    handleLiteral(expr: Expr): EvaluationResult {
        const dataMaybe = expr.getMetadata()
        if (dataMaybe) {
            let meta = dataMaybe[0];
            if (meta == LiteralTypes.BOOLEAN) {
                return new BoolResult((<LiteralExpr<boolean>>(expr)).value);
            } else if (meta == LiteralTypes.NUMBER) {
                return new NumberResult((<LiteralExpr<f64>>(expr)).value);
            } else if (meta == LiteralTypes.STRING) {
                return new StringResult((<LiteralExpr<string>>(expr)).value);
            } else {
                trace("PANIC!! Type not yet impld in interpd " + meta)
            }
        }
        return new EvaluationResult();
    }

    // Assign to existing in scope
    handleAssign(expr: AssignExpr): EvaluationResult {
        let value = this.evaluate(expr.value);

        if (this.locals.has(expr)) {
            this.environment.assignAt(this.locals.get(expr), expr.name.lexme, value);
        } else {
            // Actually stash in mem here!
            this.environment.assign(expr.name.lexme, value);
        }
        return value;
    }

    resolve(expression: Expr, depth: number): void {
        this.locals.set(expression, depth)
        trace("PANIC!! Not resolving yet!")
    }
}