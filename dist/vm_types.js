"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValueType = exports.OpCodes = void 0;
var OpCodes;
(function (OpCodes) {
    OpCodes.PUSH = 0;
    OpCodes.LOAD = 1;
    OpCodes.ADD = 20;
    OpCodes.SUB = 21;
    OpCodes.MUL = 30;
    OpCodes.DIV = 31;
    OpCodes.EQ = 40;
    OpCodes.GT = 41;
    OpCodes.GTE = 42;
    OpCodes.LT = 43;
    OpCodes.LTE = 44;
    OpCodes.IF = 50;
    OpCodes.JMP = 51;
    OpCodes.CALL = 52;
    OpCodes.STORE = 60;
    OpCodes.ASSIGN = 61;
    OpCodes.FUN = 62;
    OpCodes.FUN_END = 63;
    OpCodes.PRINT = 70;
    OpCodes.SCOPE_START = 80;
    OpCodes.SCOPE_END = 81;
    OpCodes.EOF = 255;
})(OpCodes = exports.OpCodes || (exports.OpCodes = {}));
var ValueType;
(function (ValueType) {
    ValueType.OP_CODE = 0;
    ValueType.NUMBER = 1;
    ValueType.STRING = 2;
    ValueType.ADDRESS = 3;
})(ValueType = exports.ValueType || (exports.ValueType = {}));
//# sourceMappingURL=vm_types.js.map