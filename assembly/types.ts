export namespace LiteralTypes {
  export const NUMBER = "number"; // f64
  export const STRING = "string"; // string
  export const BOOLEAN = "boolean" // boolean
}

export enum ExprType {
  AssignExpr,
  BinaryExpr,
  CallExpr,
  GetExpr,
  GroupingExpr,
  LiteralExpr,
  LogicalExpr,
  SetExpr,
  SuperExpr,
  ThisExpr,
  UnaryExpr,
  VariableExpr
};

export enum StmtType {
  ExpressionStmt,
  PrintStmt,
  VarStmt,
  VarExpressionStmt,
  BlockStmt,
  ClassStmt,
  IfStmt,
  WhileStmt,
  FunctionStmt,
  ReturnStmt
}

export type LiteralTypes = string;

export namespace TokenType {
    // Single-character tokens.
    export const LEFT_PAREN = "LEFT_PAREN"; 
    export const RIGHT_PAREN = "RIGHT_PAREN";
    export const LEFT_BRACE = "LEFT_BRACE";
    export const RIGHT_BRACE = "RIGHT_BRACE";
    export const COMMA = "COMMA"; 
    export const DOT = "DOT"; 
    export const MINUS = "MINUS"; 
    export const PLUS = "PLUS"; 
    export const SEMICOLON = "SEMICOLON"; 
    export const SLASH = "SLASH"; 
    export const STAR = "STAR";
  
    // One or two character tokens.
    export const BANG = "BANG"; 
    export const BANG_EQUAL = "BANG_EQUAL";
    export const EQUAL = "EQUAL"; 
    export const EQUAL_EQUAL = "EQUAL_EQUAL";
    export const GREATER = "GREATER"; 
    export const GREATER_EQUAL = "GREATER_EQUAL";
    export const LESS = "LESS"; 
    export const LESS_EQUAL = "LESS_EQUAL";
  
    // Literals.
    export const IDENTIFIER = "IDENTIFIER"; 
    export const STRING = "STRING"; 
    export const NUMBER = "NUMBER";
  
    // Keywords.
    export const AND = "AND"; 
    export const CLASS = "CLASS"; 
    export const ELSE = "ELSE"; 
    export const FALSE = "FALSE"; 
    export const FUN = "FUN"; 
    export const FOR = "FOR"; 
    export const IF = "IF"; 
    export const NIL = "NIL"; 
    export const OR = "OR";
    export const PRINT = "PRINT"; 
    export const RETURN = "RETURN"; 
    export const SUPER = "SUPER"; 
    export const THIS = "THIS"; 
    export const TRUE = "TRUE"; 
    export const VAR = "VAR"; 
    export const WHILE = "WHILE";
  
    export const EOF = "EOF";
  }

  export type TokenType = string;

  export class Token {
    type: TokenType;
    lexme: string;
    line: u32;
  
    constructor(type: TokenType, lexme: string, line: u32) {
      this.type = type;
      this.lexme = lexme;
      this.line = line;
    };
  
    toString(): string {
      return this.type.toString() + " " + this.lexme.toString() + " " + this.line.toString();
    };
  }

  export class ValuedToken<T> extends Token {
    value: T;
    constructor(type: TokenType, lexme: string, line: u32, value: T) {
      super(type, lexme, line);
      this.value = value;
    }
  }