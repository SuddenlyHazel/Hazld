export namespace OpCodes {
    export const PUSH = 0;
    export const LOAD = 1;

    export const ADD = 20;
    export const SUB = 21;

    export const MUL = 30;
    export const DIV = 31;

    export const EQ = 40;
    export const GT = 41;
    export const GTE = 42;
    export const LT = 43;
    export const LTE = 44;

    export const IF = 50;
    export const JMP = 51;
    export const CALL = 52;

    export const STORE = 60;
    export const ASSIGN = 61; 
    export const FUN = 62;
    export const FUN_END = 63;

    export const PRINT = 70;

    export const SCOPE_START = 80;
    export const SCOPE_END = 81;

    export const EOF = 255;
}

export namespace ValueType {
    export const OP_CODE = 0;
    export const NUMBER = 1;
    export const STRING = 2;
    export const ADDRESS = 3;
}