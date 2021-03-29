const { namespace } = require('ohm-js');

const ohm = require('ohm-js');
var Buffer = require('buffer/').Buffer  // note: the trailing slash is important!
const { OpCodes, ValueType } = require("../dist/vm_types");

const myGrammar = ohm.grammar(`
Hazld {
	Program 
    	= (Decl | Stmt)*
    
    // Delcarations
   	
    Decl 
    	= FunDecl | VarDecl 
        
    VarDecl 
    	= var identifier "=" Expr ";" --varDecl
        
    FunDecl
        = fun identifier "(" ListOf<identifier, ","> ")" BlockExpr --fun

        
    // Statements
    Stmt
        = VarAssignStmt --assignStmt
        | ExprStmt --expr
        | IfStmt
        | PrintStmt --print
    
    VarAssignStmt
    	= identifier "=" Expr ";"
    
    ExprStmt 
    	= Expr ";"
    
    IfStmt
    	= if "(" Expr ")" BlockExpr
        
    ReturnStmt
    	= return Expr
        
    PrintStmt
    	= print Expr ";"
    
    // Expressions 
    
    Expr 
    	= BlockExpr | OrExpr
    
    BlockExpr = "{" Program "}" ";"
    
    OrExpr 
      = AndExpr "||" OrExpr --or
      | AndExpr
    
	AndExpr 
      = EqExpr "&&" EqExpr --and
      | EqExpr
    
    EqExpr
      = CompareExpr "=="  CompareExpr --eq
      | CompareExpr "!="  CompareExpr --notEq
      | CompareExpr
      
    CompareExpr
    	= AddExpr ">" AddExpr --gt
    	| AddExpr ">=" AddExpr --gte
        | AddExpr "<" AddExpr --lt
    	| AddExpr "<=" AddExpr --lte
		| AddExpr
        
    AddExpr 
      = AddExpr "+" MulExpr --add
      | AddExpr "-" MulExpr --sub
      | MulExpr
    
    MulExpr 
      = MulExpr "*" CallExpr --mul
      | MulExpr "/" CallExpr --div
      | CallExpr
      
    CallExpr
      = identifier "(" ListOf<Expr, ","> ")" --call
      | PrimaryExpr
    
    PrimaryExpr 
      = "(" Expr ")" --paren
      | number --number
      | identifier --identifier
    
    number = digit+ ("." digit+)?
    
    
    var = "var" ~alnum
    if = "if"
    print = "print" ~alnum
    return = "return"
    identifier = letter+
    fun = "fun"
    
    keyword = var | print | return | if | fun
    
  comment = "//" (~eol any)* eol
  eol = "\\n" | "\\r"
  space += comment // extend Ohm built-in space with comment
}
`);

const semantics = myGrammar.createSemantics();

semantics.addOperation('getValue()', {
    NonemptyListOf(a, _seps, c) {
        const out = [a.getValue()];
        for (const otherArg of c.getValue()) {
            out.push(otherArg);
        }
        return out
    },
    EmptyListOf() {
        return []
    },
    identifier(v) {
        return this.sourceString;
    },
    _terminal() {
        return this.sourceString;
    },
});

let depth = 0;

class Frame {
    lookUp = {} // map of var name to prog slot
}

const LABEL_REFERENCE = "LABEL_REFERENCE";
const LABEL = "LABEL";

const VARIABLE = "VARIABLE"
const VARIABLE_REFERENCE = "VARIABLE_REFERENCE"

class LabelResolver {
    constructor() {
        this.label_lut = {}
        this.todos = []
        this.counter = 0;
    }

    // For use in Back Processing
    resolveLabelInByteCode(height, name) {
        this.label_lut[name] = height;
    }

    resolveLabelReference(name) {
        return this.label_lut[name];
    }

    // For use in Compiling
    createLabelReferenceOp(ptr, name) {
        return {
            "type": LABEL_REFERENCE,
            "value": name
        }
    }

    createLabelOp(name) {
        return {
            "type": LABEL,
            "name": name
        }
    }
}

function getPair(type, value, raw = false) {
    return {
        "type": type,
        "value": value,
        "raw": raw,
    }
}

function getLabel(name) {
    return {
        "type": LABEL,
        "value": name,
    }
}

function getLabelReference(name) {
    return {
        "type": LABEL_REFERENCE,
        "value": name,
    }
}

function getVariable(name) {
    return {
        "type": VARIABLE,
        "value": name
    }
}

class Scope {
    constructor() {
        this.localCount = 0;
        this.locals = {}
    }

    declareVariable(name) {
        if (this.locals[name] != null) {
            throw new Error("Cannot redeclare variable within the scope")
        }
        this.locals[name] = this.localCount;
        this.localCount += 1;
        return this.locals[name];
    }

    getVariable(name) {
        return this.locals[name];
    }
}

class ScopeResolver {
    constructor() {
        // Start with global
        this.scopes = [new Scope()]
    }

    enterBlock() {
        console.info("Entering New Scope")
        this.scopes.push(new Scope());
    }

    leaveBlock() {
        if (this.scopes.length == 1) {
            console.warm("Tried to pop global scope.")
            return;
        }
        console.info("Leaving Scope")
        this.scopes.pop();
    }

    scope() {
        return this.scopes[this.scopes.length - 1];
    }

    declareVariable(name) {
        return this.scope().declareVariable(name);
    }

    getVariable(name) {
        console.log(this.scopes)
        for (let index = this.scopes.length - 1; index >= 0; index--) {
            const varMaybe = this.scopes[index].getVariable(name);
            if (varMaybe != null) {
                return varMaybe;
            }
        }
        throw new Error("Referenced Variable which has not been declared")
    }
}

function getSemantics(compiler, scopeResolver) {
    return {
        ExprStmt(a, _term) {
            a.doBuild();
        },
        PrimaryExpr_number(_) {
            console.log(this.sourceString)
            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.PUSH))
            compiler.compileSlice(getPair(ValueType.NUMBER, parseFloat(this.sourceString)))
        },
        AddExpr_add(a, op, b) {
            a.doBuild();
            b.doBuild();
            console.log("+")
            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.ADD))
        },
        AddExpr_sub(a, op, b) {
            a.doBuild();
            b.doBuild();
            console.log("-")
            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.SUB))
        },
        MulExpr_mul(a, op, b) {
            a.doBuild();
            b.doBuild();
            console.log("*")
            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.MUL))
        },
        MulExpr_div(a, op, b) {
            a.doBuild();
            b.doBuild();
            console.log("/")
            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.DIV))
        },
        VarDecl_varDecl(_tkn, name, _, value, _term) {
            value.doBuild();
            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.STORE))
            compiler.compileSlice(getPair(ValueType.STRING, name.getValue()))
        },
        VarAssignStmt(name, op, value, _term) {
            console.log(name.sourceString)
            value.doBuild();
            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.ASSIGN))
            compiler.compileSlice(getPair(ValueType.STRING, name.sourceString))
        },
        PrintStmt(_token, expr, _term) {
            expr.doBuild();
            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.PRINT))
            console.log("PRINT")
        },
        IfStmt(_tkn, _l, expr, _r, block) {
            expr.doBuild();

            console.log("IF")

            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.IF))
            const afterPtrStart = compiler.compileSlice(getPair(ValueType.ADDRESS, 0)) - 5 // after
            compiler.compileSlice(getPair(ValueType.ADDRESS, afterPtrStart + 5)) // block

            block.doBuild();
            compiler.backProcessAddress(afterPtrStart)
        },
        BlockExpr(_l, prog, _r, _term) {
            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.SCOPE_START))
            scopeResolver.enterBlock();
            prog.doBuild();
            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.SCOPE_END))
            scopeResolver.leaveBlock();
        },
        EqExpr_eq(left, _op, right) {
            left.doBuild();
            right.doBuild();
            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.EQ));
            console.log("EQ?", OpCodes.EQ)
        },
        FunDecl_fun(_tkn, name, _l, args, _r, block) {
            console.log(args.getValue())
            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.FUN));
            compiler.compileSlice(getPair(ValueType.STRING, name.getValue())); // Pack name
            compiler.compileSlice(getPair(ValueType.ADDRESS, args.getValue().length)); // Pack arity
            for (const arg of args.getValue()) { // Pack all args
                compiler.compileSlice(getPair(ValueType.STRING, arg));
            }
            const endPointer = compiler.compileSlice(getPair(ValueType.ADDRESS, 0)) - 5 // Pack End Placeholder

            block.doBuild();

            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.FUN_END))
            compiler.backProcessAddress(endPointer)
        },
        CallExpr_call(name, _l, expr, _r) {
            expr.doBuild();
            console.log(name.getValue);
            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.CALL));
            compiler.compileSlice(getPair(ValueType.STRING, name.getValue())); // Pack name
        },
        PrimaryExpr_paren(_l, expr, _r) {
            expr.doBuild();
        },
        PrimaryExpr_identifier(v) {
            const value = v.getValue();
            console.log("LOAD " + value)
            compiler.compileSlice(getPair(ValueType.OP_CODE, OpCodes.LOAD))
            compiler.compileSlice(getPair(ValueType.STRING, value))
        },
        NonemptyListOf(ex, _seps, rest) {
            ex.doBuild()
            rest.doBuild()
        }
    }
}

class Compiler {

    constructor(programString) {
        this.programString = programString;
        this.program = []; // OPS
        this.labelResolver = new LabelResolver();
        this.programBytes = []; // ByteCode
    }

    compile() {
        const m = myGrammar.match(this.programString);
        const adapter = semantics(m);
        semantics.addOperation("doBuild", getSemantics(this, new ScopeResolver()));
        adapter.doBuild();
        //this.program.push(OpCodes.EOF); ADD EOF!!
        return [this.programBytes, this.program]
    }

    compileSlice(op) {
        this.program.push(op);
        switch (op.type) {
            case (ValueType.OP_CODE):
                this.packOpCode(op.value, this.programBytes)
                break;
            case (ValueType.NUMBER):
                if (op.raw) {
                    this.packNumberRaw(op.value, this.programBytes)
                } else {
                    this.packNumber(op.value, this.programBytes)
                }
                break;
            case (ValueType.STRING):
                this.packString(op.value, this.programBytes)
                break;
            case (ValueType.ADDRESS):
                this.packAddress(op.value, this.programBytes)
                break;
        }
        return this.programBytes.length;
    }

    // Given a Ptr backfill with the current height
    backProcessAddress(ptr) {
        const numberBytes = []
        this.packAddress(this.getHeight(), numberBytes);
        for (let index = 1; index < 5; index++) {
            console.log("STEP", ptr + index)
            this.programBytes[ptr + index] = numberBytes[index]
        }
    }

    getHeight() {
        return this.programBytes.length;
    }

    // OPCODES (type, code) -> (UINT8, UINT8)
    packOpCode(code, payload) {
        payload.push(ValueType.OP_CODE);
        payload.push(code);
    }

    // Address (type, value) -> (UINT8, UINT32)
    packAddress(value, payload) {
        payload.push(ValueType.ADDRESS);

        const placeholder = new Uint32Array([value]);
        const packedPlaceholder = new Uint8Array(placeholder.buffer);
        payload.push(packedPlaceholder[0], packedPlaceholder[1], packedPlaceholder[2], packedPlaceholder[3]);

    }

    // Number (type, value) -> (UINT8, F64)
    packNumber(value, payload) {
        const code = new Uint8Array([ValueType.NUMBER]);

        const floatBytes = new Float64Array([value]);
        console.log(floatBytes.byteLength)
        var packedNumber = new Uint8Array(floatBytes.buffer);

        payload.push(code[0])
        payload.push(packedNumber[0], packedNumber[1], packedNumber[2], packedNumber[3]);
        payload.push(packedNumber[4], packedNumber[5], packedNumber[6], packedNumber[7]);
    }

    packNumberRaw(value, payload) {
        const floatBytes = new Float64Array([value]);
        var packedNumber = new Uint8Array(floatBytes.buffer);
        payload.push(packedNumber[0], packedNumber[1], packedNumber[2], packedNumber[3]);
        payload.push(packedNumber[4], packedNumber[5], packedNumber[6], packedNumber[7]);
    }

    // STRING (type, size, bytes ..) UINT8, UINT32, UInt16
    packString(str, payload) {
        console.log("%%%", str)
        const code = new Uint8Array([ValueType.STRING]);

        const length = new Uint8Array(new Uint32Array([str.length]).buffer);
        console.log("%%%", length)

        var buf = new ArrayBuffer(str.length * 2);
        var bufView = new Uint16Array(buf);

        for (var i = 0; i < str.length; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        const packedString = new Uint8Array(bufView.buffer);

        payload.push(code[0]);
        payload.push(length[0], length[1], length[2], length[3]);

        for (let index = 0; index < packedString.byteLength; index++) {
            payload.push(packedString[index]);
        }
    }

}

module.exports = { Compiler }