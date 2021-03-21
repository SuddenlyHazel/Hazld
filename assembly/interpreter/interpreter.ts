import {
    BinaryExpr, Expr, Stmt, GroupingExpr, LiteralExpr, LogicalExpr, UnaryExpr,
    ExpressionStmt, FunctionStmt, IfStmt, WhileStmt, ReturnStmt, BlockStmt, PrintStmt, AssignExpr, VarStmt, VariableExpr, CallExpr
} from "../ast/ast_types";
import {
    LiteralTypes, Token, TokenType, ExprType, StmtType
} from "../types";
import {Environment, BaseInterpreter, HazldCallable, EvaluationResult, NumberResult, StringResult, BoolResult, ResultType} from "./interpreter_types";

export class Interpreter extends BaseInterpreter {
    // Stash built-ins,
    private globals : Environment = new Environment();

    private environment : Environment = this.globals;

    constructor() {
         super();
    }

    interpret(statements: Stmt[]): void {
        for (let index = 0; index < statements.length; index++) {
            const statement = statements[index];
            this.evaluateStatement(statement);
        }
    }

    evaluateStatement(stmt: Stmt): void {
        switch (stmt.type) {
            case StmtType.ExpressionStmt:
                trace("Handling Expression");
                this.evaluate((<ExpressionStmt>(stmt)).expression);
                break;
            case StmtType.PrintStmt:
                trace("Handling Print");
                this.printStmt(<PrintStmt>(stmt));
                break;
            case StmtType.VarStmt:
                trace("Handling Var");
                this.varStmt(<VarStmt>stmt);
                break;
            case StmtType.BlockStmt:
                trace("We're in a block!!")
                this.blockStmt(<BlockStmt>stmt, new Environment(this.environment))
                break;
            case StmtType.IfStmt:
                trace("Handling IF");
                this.ifStmt(<IfStmt>stmt);
                break;
            case StmtType.WhileStmt:
                trace("Handling While");
                this.whileStmt(<WhileStmt>(stmt));
                break;
            case StmtType.FunctionStmt:
                break;
            case StmtType.ReturnStmt:
                trace("Handling Return");
                this.returnStmt(<ReturnStmt>(stmt));
                break;
            case StmtType.ClassStmt:
                break;
        }
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
                break;
        }
        return new EvaluationResult();
    }
    // Init var!
    varStmt(stmt: VarStmt): void {
        if (stmt.initializer != null) {
            const val = this.evaluate(<Expr>stmt.initializer);
            this.environment.define(stmt.name.lexme, val);
            trace("Init var name " + stmt.name.lexme + " with value " + val.toString())
        }
    }

    blockStmt(stmt: BlockStmt, localScope : Environment): void {
        const previousEnv = this.environment;
        this.environment = localScope;
        for (let index = 0; index < stmt.statements.length; index++) {
            const statement = stmt.statements[index];
            this.evaluateStatement(statement);
        }
        this.environment = previousEnv;
    };

    printStmt(stmt: PrintStmt): void {
        // Hazel TODO make this better
        trace("Print is: " + this.evaluate(stmt.expression).toString());
    }

    ifStmt(stmt: IfStmt): void {
        if (this.isTruthy(this.evaluate(stmt.condition))) {
            this.evaluateStatement(stmt.thenBranch);
        } else if (stmt.elseBranch != null) {
            this.evaluateStatement(<Stmt>stmt.elseBranch);
        }
    }

    whileStmt(stmt: WhileStmt): void {
        while (this.isTruthy(this.evaluate(stmt.condition))) {
            this.evaluateStatement(stmt.body);
        }
    }

    returnStmt(stmt: ReturnStmt): void {
        if (stmt.value != null) {
            this.evaluate(<Expr>stmt.value)
        }
        trace("Shouldnt be here!")
    };

    isTruthy(expr: EvaluationResult): boolean {
        return expr.isTruthy();
    };

    handleCall(expr : CallExpr) : EvaluationResult {
        const callee = this.evaluate(expr.callee);

        const args : EvaluationResult[] = [];
        for (let index = 0; index < expr.argument.length; index++) {
            args.push(this.evaluate(expr.argument[index]));
        }

       // Call Callee result here!!
       if (!(callee instanceof HazldCallable)) {
           trace("Can only call functions and methods!")
           return new EvaluationResult();
       }

       if (args.length != callee.arity) {
        trace("Caller did not provide correct number of arguments!")
        return new EvaluationResult();
       }

       return (<HazldCallable>callee).call(this, args);
    }; 

    handleVariable(expr : VariableExpr) : EvaluationResult {
        return this.environment.get(expr.name);
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
        // Actually stash in mem here!
        this.environment.assign(expr.name.lexme, value);
        return value;
    }
}