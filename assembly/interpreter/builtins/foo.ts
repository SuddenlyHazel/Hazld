
import {
    BinaryExpr, Expr, Stmt, GroupingExpr, LiteralExpr, LogicalExpr, UnaryExpr,
    ExpressionStmt, FunctionStmt, IfStmt, WhileStmt, ReturnStmt, BlockStmt, PrintStmt, AssignExpr, VarStmt, VariableExpr, CallExpr
} from "../../ast/ast_types";
import {
    LiteralTypes, Token, TokenType, ExprType, StmtType
} from "../../types";
import {Environment, BaseInterpreter, HazldCallable, EvaluationResult, NumberResult, StringResult, BoolResult, ResultType, BuiltInFunction} from "./../interpreter_types";

export class Foo extends BuiltInFunction {
    constructor() {
        super("foo", 0);
    }

    call(inter: BaseInterpreter, args: EvaluationResult[]) : EvaluationResult {
        return new StringResult("Foo Bar!")
    }
}