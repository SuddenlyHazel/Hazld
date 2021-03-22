import { AssignExpr, BinaryExpr, BlockStmt, CallExpr, Expr, ExpressionStmt, FunctionStmt, GroupingExpr, IfStmt, LiteralExpr, LogicalExpr, PrintStmt, ReturnStmt, Stmt, UnaryExpr, VarExpressionStmt, VariableExpr, VarStmt, WhileStmt } from "./ast/ast_types";
import { ExprType, StmtType, Token, TokenType, ValuedToken } from "./types";

export class Parser {
    current: i32 = 0;
    constructor(public tokens: Array<Token>) {
        for (let index = 0; index < tokens.length; index++) {
            const element = tokens[index];
        }
    }

    parse(): Stmt[] {
        const statements: Stmt[] = [];
        while (!this.isAtEnd()) {
            statements.push(this.declaration());
        };
        return statements;
    }
    // Check for declarations [Var, Func, Class]
    declaration(): Stmt {
        if (this.match([TokenType.FUN])){
            return this.functionDeclarationStatement()
        }
        else if (this.match([TokenType.VAR])) {
            return this.variableDeclarationStatement();
        }
        return this.statement();
    }
    // Check for statements
    statement(): Stmt {
        // TODO
        if (this.match([TokenType.PRINT])) {
            return this.printStatement();
        } else if (this.match([TokenType.LEFT_BRACE])) {
            return new BlockStmt(this.block())
        } else if (this.match([TokenType.IF])) {
            return this.if();
        } else if (this.match([TokenType.WHILE])) {
            return this.while();
        } else if (this.match([TokenType.FOR])) {
            return this.for();
        } else if (this.match([TokenType.RETURN])) {
            return this.return();
        }

        return this.expressionStatement();
    }

    return() : Stmt {
        const keyword = this.previous();
        var value : Expr | null = null;
        if (!this.check(TokenType.SEMICOLON)) {
            value = this.expression();
        }
        this.consume(TokenType.SEMICOLON, "Expect ; after return value");
        return new ReturnStmt(keyword, value);
    }

    // Build a for
    for(): Stmt {
        this.consume(TokenType.LEFT_PAREN, "Expect ( after for");
        var init: Stmt | null = null;
        if (this.match([TokenType.SEMICOLON])) {
            init = null;
        } else if (this.match([TokenType.VAR])) {
            init = this.variableDeclarationStatement();
        } else {
            init = this.expressionStatement();
        }

        var condition: Expr | null = null;
        if (!this.check(TokenType.SEMICOLON)) {
            condition = this.expression(); // maybe
        }
        this.consume(TokenType.SEMICOLON, "Expect ; after loop condition");

        var inc: Expr | null = null;
        if (!this.check(TokenType.RIGHT_PAREN)) {
            inc = this.expression();
        }
        this.consume(TokenType.RIGHT_PAREN, "Expect ) after for clause");

        var body: Stmt | null = this.statement();
        if (inc != null) {
            body = new BlockStmt([<Stmt>body, new ExpressionStmt(inc)]);
        }

        if (condition == null) {
            condition = new LiteralExpr<bool>(true, 'true');
        }
        body = new WhileStmt(<Expr>condition, <Stmt>body);

        if (init != null) body = new BlockStmt([init, body]);

        return body;
    };

    // Build an if
    if(): Stmt {
        this.consume(TokenType.LEFT_PAREN, "Expect ( after if");
        const condition = this.expression();
        this.consume(TokenType.RIGHT_PAREN, "Expect ) after condition");

        const thenBranch = this.statement();
        var elseBranch : Stmt | null = null;
        if (this.match([TokenType.ELSE])) {
            elseBranch = this.statement();
        }
        return new IfStmt(condition, thenBranch, elseBranch);
    }

    // build a while
    while(): Stmt {
        this.consume(TokenType.LEFT_PAREN, "Expect ( after while");
        const condition = this.expression();
        this.consume(TokenType.RIGHT_PAREN, "Expect ) after condition");
        const body = this.statement();
        return new WhileStmt(condition, body);
    }

    // build block of statements
    block(): Stmt[] {
        const statements: Stmt[] = []

        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
            const dec = this.declaration();
            if (dec != null) {
                statements.push(dec);
            }
        }
        this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.");
        return statements;
    }

    // Build variable declaration
    variableDeclarationStatement(): Stmt {
        const name = this.consume(TokenType.IDENTIFIER, "Expect variable name");
        if (this.match([TokenType.EQUAL]) && name != null) {
            if (this.peek().type == TokenType.LEFT_BRACE) {
                this.consume(TokenType.LEFT_BRACE, "Need left brace!");
                const init = this.block();
                return new VarExpressionStmt(name, new BlockStmt(init));
            }

            const initializer = this.expression();
            this.consume(TokenType.SEMICOLON, "Expect ; after variable declaration")
            return new VarStmt(name, initializer);
        }
        trace("Panic! Could not declare variable");
        return new Stmt(StmtType.ReturnStmt);
    }

    // Build a function declaration
    functionDeclarationStatement(): Stmt {
        const name = this.consume(TokenType.IDENTIFIER, "Expect Function name");
        if (name == null) {
            return new Stmt(StmtType.ExpressionStmt);
        }

        this.consume(TokenType.LEFT_PAREN, "Expect ( after function name");
        // Build args
        const params : Token[] = [];
        if (!this.check(TokenType.RIGHT_PAREN)) {
            do {
                const tokenMaybe = this.consume(TokenType.IDENTIFIER, "Expected Param name");
                if (tokenMaybe != null) params.push(<Token>tokenMaybe);
            } while (this.match([TokenType.COMMA]))
        }

        this.consume(TokenType.RIGHT_PAREN, "Expected ) after params");
        this.consume(TokenType.LEFT_BRACE, "Expected { before body");
        const body = this.block();

        return new FunctionStmt(name, params, body);
    }

    // Build print statement
    printStatement(): Stmt {
        const value = this.expression();
        this.consume(TokenType.SEMICOLON, "Expect ; after value");
        return new PrintStmt(value);
    }

    // Build an expresstion statement
    expressionStatement(): Stmt {
        const expr = this.expression();
        this.consume(TokenType.SEMICOLON, "Expect ; after expression");
        return new ExpressionStmt(expr);
    }

    // Handle Expression
    expression(): Expr {
        return this.assignment();
    }

    // Build an assignment
    assignment(): Expr {
        const expr = this.or();
        if (this.match([TokenType.EQUAL])) {
            const equals = this.previous();
            const value = this.assignment();

            if (expr.type == ExprType.VariableExpr) {
                const name = (<VariableExpr>(expr)).name;
                return new AssignExpr(name, value);
            } else if (expr.type == ExprType.GetExpr) {
                trace("ahh no gets yet")
            }

            trace("Panic! invalid assignment" + equals.toString());
        }
        return expr;
    }

    // Build Or
    or(): Expr {
        var expr = this.and();
        while (this.match([TokenType.OR])) {
            const op = this.previous();
            const right = this.and();
            expr = new LogicalExpr(expr, op, right);
        }
        return expr;
    }

    // Build And
    and(): Expr {
        var expr = this.equality();
        while (this.match([TokenType.AND])) {
            const op = this.previous();
            const right = this.equality();
            expr = new LogicalExpr(expr, op, right);
        }
        return expr;
    }

    // Build Equality
    equality(): Expr {
        var expr: Expr = this.comparison();
        while (this.match([TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL])) {
            const operator = this.previous();
            const right = this.comparison();
            expr = new BinaryExpr(expr, operator.type, right);
        }
        return expr;
    }

    // Build comparison
    comparison(): Expr {
        var expr: Expr = this.term();

        while (this.match([TokenType.GREATER, TokenType.LESS, TokenType.LESS_EQUAL, TokenType.GREATER_EQUAL])) {
            var operator = this.previous();
            var right = this.term();
            expr = new BinaryExpr(expr, operator.type, right);
        }

        return expr;
    }

    /// Handle Terms
    term(): Expr {
        var expr = this.factor();

        while (this.match([TokenType.MINUS, TokenType.PLUS])) {
            var operator = this.previous();
            var right = this.factor();
            expr = new BinaryExpr(expr, operator.type, right);
        }
        return expr;
    }

    // Handle Factor ops
    factor(): Expr {
        var expr: Expr = this.unary();

        while (this.match([TokenType.STAR, TokenType.SLASH])) {
            var operator = this.previous();
            var right = this.unary();
            expr = new BinaryExpr(expr, operator.type, right);
        }
        return expr;
    }

    // Handle Unary ops
    unary(): Expr {
        if (this.match([TokenType.BANG, TokenType.MINUS])) {
            var operator = this.previous();
            var right = this.unary();
            return new UnaryExpr(operator.type, right);
        }
        return this.call();
    }

    // Handle Calls
    call(): Expr {
        var expr = this.primary();
        while (true) {
            if (this.match([TokenType.LEFT_PAREN])) {
                expr = this.finishCall(expr);
            } else {
                break;
            }
        }

        return expr;
    }

    finishCall(callee: Expr): Expr {
        var allArgs : Expr[] = [];
        if (!this.check(TokenType.RIGHT_PAREN)) {
            do {
                allArgs.push(this.expression());
            } while (this.match([TokenType.COMMA]));
        }

        var paren = this.consume(TokenType.RIGHT_PAREN, "Expect ) after args");
        if (paren == null) {
            return callee;
        }
        return new CallExpr(callee, paren, allArgs);
    }   

    // Handle Rest of Tokens
    primary(): Expr {

        if (this.match([TokenType.FALSE])) return new LiteralExpr<boolean>(false, 'false');
        if (this.match([TokenType.TRUE])) return new LiteralExpr<boolean>(true, 'false');
        if (this.match([TokenType.NIL])) return new LiteralExpr<boolean>(false, 'false');

        if (this.match([TokenType.NUMBER])) {
            const v = this.previous();
            const tkn: ValuedToken<f64> = <ValuedToken<f64>>(v);
            return new LiteralExpr<f64>(tkn.value, tkn.value.toString())
        }

        if (this.match([TokenType.STRING])) {
            const v = this.previous();
            const tkn: ValuedToken<string> = <ValuedToken<string>>(v);
            return new LiteralExpr<string>(tkn.value, tkn.value.toString())
        }

        if (this.match([TokenType.IDENTIFIER])) {
            var token = this.previous();
            return new VariableExpr(token);
        }

        if (this.match([TokenType.LEFT_PAREN])) {
            var expr = this.expression();
            this.consume(TokenType.RIGHT_PAREN, "Expect ') after expression")
            return new GroupingExpr(expr);
        }

        trace('Panic!! ' + this.peek().toString());
        // Hazel TODO ... Error somehow
        return new LiteralExpr<boolean>(false, 'false');
    }

    consume(type: TokenType, message: string): Token | null {
        if (this.check(type)) return this.advance();
        // Hazel TODO actually panic..
        return null;
    }

    match(tokens: TokenType[]): boolean {
        for (let index = 0; index < tokens.length; index++) {
            if (this.check(tokens[index])) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    check(token: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().type == token;
    }

    advance(): Token {
        if (!this.isAtEnd()) this.current += 1;
        return this.previous();
    }

    isAtEnd(): boolean {
        return this.peek().type == TokenType.EOF;
    }

    peek(): Token {
        return this.tokens[this.current];
    }

    previous(): Token {
        return this.tokens[this.current - 1];
    }
}