import { TokenType, Token, ValuedToken } from './types';
import "./ast/ast_types";
import { AstPrinter } from "./ast/ast";
import { Parser } from "./parser";
import { Expr, PrintStmt, Stmt } from './ast/ast_types';
import { Interpreter } from "./interpreter/interpreter";
import { Resolver } from './resolver';
import { VM } from './vm';

// The entry file of your WebAssembly module.
class Hazld {
  constructor() {

  }
}

export const PROG_ARRAY = idof<Uint8Array>()

export function run(prog : Uint8Array): void {
  const vm: VM = new VM(prog);

  vm.run();
}
