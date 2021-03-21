import {TokenType, Token, ValuedToken} from './types';
import "./ast/ast_types";
import {AstPrinter} from "./ast/ast";
import { Parser } from "./parser";
import { Expr, Stmt } from './ast/ast_types';
import {Interpreter} from "./interpreter/interpreter";

// The entry file of your WebAssembly module.
class Hazld {
  constructor() {

  }
}

let KEYWORDS_STR: Map<TokenType, string> = new Map<TokenType, string>();


let KEYWORDS: Map<string, TokenType> = new Map<string, TokenType>();
KEYWORDS.set("and", TokenType.AND);
KEYWORDS.set("class", TokenType.CLASS);
KEYWORDS.set("else", TokenType.ELSE);
KEYWORDS.set("false", TokenType.FALSE);
KEYWORDS.set("for", TokenType.FOR);
KEYWORDS.set("fun", TokenType.FUN);
KEYWORDS.set("if", TokenType.IF);
KEYWORDS.set("nil", TokenType.NIL);
KEYWORDS.set("or", TokenType.OR);
KEYWORDS.set("print", TokenType.PRINT);
KEYWORDS.set("return", TokenType.RETURN);
KEYWORDS.set("super", TokenType.SUPER);
KEYWORDS.set("this", TokenType.THIS);
KEYWORDS.set("true", TokenType.TRUE);
KEYWORDS.set("var", TokenType.VAR);
KEYWORDS.set("while", TokenType.WHILE);



class Scanner {
  source: String;
  tokens: Array<Token> = new Array<Token>(0);

  start: i32 = 0;
  current: i32 = 0;
  line: i32 = 0;

  constructor(src: String) {
    src.length;
    this.source = src;
    trace("Code is " + this.source);
  }

  scanAllToken(): Array<Token> {
    while (!(this.current >= this.source.length)) {
      this.start = this.current;
      this.scanToken();
    }
    this.tokens.push(new Token(TokenType.EOF, '', this.line))
    return this.tokens;
  }

  getCharCode(c: string): i32 {
    return c.charCodeAt(0);
  };

  scanToken(): void {
    let c: string = this.advance();
    switch (this.getCharCode(c)) {
      case this.getCharCode('('): this.addToken(TokenType.LEFT_PAREN); break;
      case this.getCharCode(')'): this.addToken(TokenType.RIGHT_PAREN); break;
      case this.getCharCode('{'): this.addToken(TokenType.LEFT_BRACE); break;
      case this.getCharCode('}'): this.addToken(TokenType.RIGHT_BRACE); break;
      case this.getCharCode(','): this.addToken(TokenType.COMMA); break;
      case this.getCharCode('.'): this.addToken(TokenType.DOT); break;
      case this.getCharCode('-'): this.addToken(TokenType.MINUS); break;
      case this.getCharCode('+'): this.addToken(TokenType.PLUS); break;
      case this.getCharCode(';'): this.addToken(TokenType.SEMICOLON); break;
      case this.getCharCode('*'): this.addToken(TokenType.STAR); break;
      case this.getCharCode('!'):
        this.addToken(this.match('=') ? TokenType.BANG_EQUAL : TokenType.BANG)
        break
      case this.getCharCode('='):
        this.addToken(this.match('=') ? TokenType.EQUAL_EQUAL : TokenType.EQUAL)
        break
      case this.getCharCode('<'):
        this.addToken(this.match('=') ? TokenType.LESS_EQUAL : TokenType.LESS)
        break
      case this.getCharCode('>'):
        this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER)
        break
      case this.getCharCode('/'):
        if (this.match('/')) {
          // A comment goes until the end of the line.
          while (this.peek() != '\n' && !this.isAtEnd()) this.advance()
        } else {
          this.addToken(TokenType.SLASH)
        }
        break;
      case this.getCharCode(' '):
      case this.getCharCode('\r'):
      case this.getCharCode('\t'):
        // Ignore whitespace.
        break
      case this.getCharCode('\n'):
        this.line++
        break
      case this.getCharCode('"'):
        this.string();
        break
      default:
        if (this.isDigit(c)) {
          this.number();
        } else if (this.isAlpha(c)) {
          this.identifier();
        } else {
        }
        break;
    }
  }

  string(): void {
    while (this.peek() != '"' && !this.isAtEnd()) {
      if (this.peek() == '\n') this.line+=1;
      this.advance();
    }

    if (this.isAtEnd()) {
      trace(this.line.toString() + " Unterminated String!")
      return;
    }
    // The closing "
    this.advance();
    let value : string = this.source.substring(this.start + 1, this.current - 1);

    this.addTokenWithValue(TokenType.STRING, value);
  }

  identifier(): void {
    while (this.isAlphaNumeric(this.peek())) this.advance();
    const text = this.source.substring(this.start, this.current);

    let type = KEYWORDS.has(text) ? KEYWORDS.get(text) : TokenType.IDENTIFIER;

    this.addToken(type);
  }

  isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') ||
      (c >= 'A' && c <= 'Z') ||
      c == '_';
  }

  isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  isAtEnd(): boolean {
    return this.current >= this.source.length
  }

  number(): void {
    trace("Trying to build number value!")
    while (this.isDigit(this.peek())) this.advance();

    if (this.peek() == '.' && this.isDigit(this.peekNext())) {
      this.advance();
      while (this.isDigit(this.peek())) this.advance();
    }

    this.addTokenWithValue<f64>(TokenType.NUMBER,
      parseFloat(this.source.substring(this.start, this.current)));
  };

  peek(): string {
    if (this.current >= this.source.length) return '\0';
    return this.source.charAt(this.current);
  }

  peekNext(): string {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source.charAt(this.current + 1);
  }

  match(v: string): bool {
    if (this.current >= this.source.length) return false;
    if (this.source.charAt(this.current) !== v) return false;
    this.current += 1;
    return true;
  }

  advance(): string {
    this.current += 1;
    return this.source.charAt(this.current - 1);
  }

  addToken(t: TokenType): void {
    this.tokens.push(
      new Token(t, this.source.substring(this.start, this.current), this.line)
    )
  }

  addTokenWithValue<T>(t: TokenType, value: T): void {
    const token: ValuedToken<T> = new ValuedToken(t, this.source.substring(this.start, this.current), this.line, value);
    this.tokens.push(token);
  }
}

export function add(a: i32, b: i32): i32 {
  return a + b;
}

export function parse(code: string) : string {
  let tokens = new Scanner(code).scanAllToken();

  let statements = new Parser(tokens).parse();

  let interp = new Interpreter();
  interp.interpret(statements);

  return '';
}

export function main(args: Array<string>): void {
  if (args.length > 1) {
  } else if (args.length == 1) {

    // runData
  } else {
    // repl
  }
}
