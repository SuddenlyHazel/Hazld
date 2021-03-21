import {
    Visitor, AssignExpr, BinaryExpr, CallExpr,
    GetExpr, GroupingExpr, LiteralExpr, LogicalExpr, SetExpr,
    SuperExpr, ThisExpr, UnaryExpr, VariableExpr, Expr
} from "./ast_types"

export class AstPrinter extends Visitor {
    constructor() {
        super();
    }

    print(expr : Expr) : string {
        return expr.accept(this);
    }

    visitAssignExpr(v: AssignExpr): string {
        return "visitAssignExpr";
    }

    visitBinaryExpr(v: BinaryExpr): string {
        return v.toString();
    }

    visitCallExpr(v: CallExpr): string {
        return 'visitCallExpr'
    }
    visitGetExpr(v: GetExpr): string {
        return 'visitGetExpr'
    }
    visitGroupingExpr(v: GroupingExpr): string {
        return 'visitGroupingExpr'
    }
    visitLiteralExpr<T>(v: LiteralExpr<T>, value : string): string {
        return 'LiteralExpr ' + value;
    }
    visitLogicalExpr(v: LogicalExpr): string {
        return 'visitLogicalExpr'
    }
    visitSetExpr(v: SetExpr): string {
        return 'visitSetExpr'
    }
    visitSuperExpr(v: SuperExpr): string {
        return 'visitSuperExpr'
    }
    visitThisExpr(v: ThisExpr): string {
        return 'visitThisExpr'
    }
    visitUnaryExpr(v: UnaryExpr): string {
        return 'visitUnaryExpr'
    }
    visitVariableExpr(v: VariableExpr): string {
        return 'visitVariableExpr'
    }
}