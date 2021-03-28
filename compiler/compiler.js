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
    	= fun identifier BlockExpr --fun
        
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
      = MulExpr "*" PrimaryExpr --mul
      | MulExpr "/" PrimaryExpr --div
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

    // add a label to backfill
    // ptr = where it is in stack
    // labelName = who it's looking for
    addTodo(ptr, labelName) {
        this.todos({
            ptr: ptr,
            label: labelName
        })
    }

    // create a new label
    createLabel(ptr) {
        const name = "@" + this.counter;
        this.label_lut[name] = ptr;
        this.counter += 1;
        return this.name;
    }

    reserveLabel() {
        const name = "@" + this.counter;
        this.counter += 1;
        return name;
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

function getSemantics(program, labelResolver, scopeResolver) {
    return {
        ExprStmt(a, _term) {
            a.doBuild();
        },
        PrimaryExpr_number(_) {
            console.log(this.sourceString)
            program.push(getPair(ValueType.OP_CODE, OpCodes.PUSH))
            program.push(getPair(ValueType.NUMBER, parseFloat(this.sourceString)))
        },
        AddExpr_add(a, op, b) {
            a.doBuild();
            b.doBuild();
            console.log("+")
            program.push(getPair(ValueType.OP_CODE, OpCodes.ADD))
        },
        AddExpr_sub(a, op, b) {
            a.doBuild();
            b.doBuild();
            console.log("-")
            program.push(getPair(ValueType.OP_CODE, OpCodes.SUB))
        },
        MulExpr_mul(a, op, b) {
            a.doBuild();
            b.doBuild();
            console.log("*")
            program.push(getPair(ValueType.OP_CODE, OpCodes.MUL))
        },
        MulExpr_div(a, op, b) {
            a.doBuild();
            b.doBuild();
            console.log("/")
            program.push(getPair(ValueType.OP_CODE, OpCodes.DIV))
        },
        VarDecl_varDecl(_tkn, name, _, value, _term) {
            value.doBuild();
            program.push(getPair(ValueType.OP_CODE, OpCodes.STORE))
            const varName = name.getValue();
            console.log("STORE " + varName)
            scopeResolver.declareVariable(varName);
        },
        VarAssignStmt(name, op, value, _term) {
            console.log(name.sourceString)
            value.doBuild();
            program.push(getPair(ValueType.OP_CODE, OpCodes.ASSIGN))
            program.push(getPair(ValueType.STRING, name.sourceString))
        },
        PrintStmt(_token, expr, _term) {
            expr.doBuild();
            program.push(getPair(ValueType.OP_CODE, OpCodes.PRINT))
            console.log("PRINT")
        },
        IfStmt(_tkn, _l, expr, _r, block) {
            expr.doBuild();

            console.log("IF")

            program.push(getPair(ValueType.OP_CODE, OpCodes.IF))

            const blockStartLabel = labelResolver.reserveLabel();
            const blockEndLabel = labelResolver.reserveLabel();

            program.push(getLabelReference(blockStartLabel));
            program.push(getLabelReference(blockEndLabel));

            program.push(getLabel(blockStartLabel))
            block.doBuild(); // Backfill address
            program.push(getLabel(blockEndLabel))
        },
        BlockExpr(_l, prog, _r, _term) {
            program.push(getPair(ValueType.OP_CODE, OpCodes.SCOPE_START))
            scopeResolver.enterBlock();
            prog.doBuild();
            program.push(getPair(ValueType.OP_CODE, OpCodes.SCOPE_END))
            scopeResolver.leaveBlock();
            program.push("FRAME_END")
        },
        EqExpr_eq(left, _op, right) {
            left.doBuild();
            right.doBuild();
            program.push(getPair(ValueType.OP_CODE, OpCodes.EQ));
            console.log("EQ?", OpCodes.EQ)
        },
        FunDecl_fun(_tkn, name, block) {
            console.log(name.sourceString)
            program.push(getPair(ValueType.OP_CODE, OpCodes.JMP));

            const blockEndLabel = labelResolver.reserveLabel();
            program.push(getLabelReference(blockEndLabel));

            block.doBuild();

            program.push(getLabel(blockEndLabel))

        },
        PrimaryExpr_paren(_l, expr, _r) {
            expr.doBuild();
        },
        PrimaryExpr_identifier(v) {
            const value = v.getValue();
            console.log("LOAD " + value)
            program.push(getPair(ValueType.OP_CODE, OpCodes.LOAD))
            program.push(getPair(ValueType.NUMBER, scopeResolver.getVariable(value), true))
        }
    }
}

class Compiler {

    constructor(programString) {
        this.programString = programString;
        this.program = [];
        this.labelResolver = new LabelResolver();
    }

    compile() {
        const m = myGrammar.match(this.programString);
        const adapter = semantics(m);
        semantics.addOperation("doBuild", getSemantics(this.program, this.labelResolver, new ScopeResolver()));
        adapter.doBuild();
        this.program.push(OpCodes.EOF);

        return this._getCompiledProgram();
    }

    _getCompiledProgram() {
        const programBytes = [];
        const labels = {};
        const backfill_labels = [];

        for (const op of this.program) {
            if (op.type == LABEL) {
                labels[op.value] = {
                    height: programBytes.length,
                    value: new Uint8Array(new Uint32Array([programBytes.length]).buffer)
                };
                console.log(labels[op.value])
                continue;
            }

            if (op.type == LABEL_REFERENCE) {
                backfill_labels.push({
                    ptr: programBytes.length,
                    label: op.value
                })
                this._packAddressPlaceholder(programBytes);
                console.log("Adding Ref")
                continue;
            }

            switch (op.type) {
                case (ValueType.OP_CODE):
                    this._packOpCode(op.value, programBytes)
                    break;
                case (ValueType.NUMBER):
                    if (op.raw) {
                        this._packNumberRaw(op.value, programBytes)
                    } else {
                        this._packNumber(op.value, programBytes)
                    }
                    break;
                case (ValueType.STRING):
                    this._packString(op.value, programBytes)
                    break;
            }
        }

        for (const placeholder of backfill_labels) {
            const resolvedLabel = labels[placeholder.label];
            if (resolvedLabel == null) {
                throw new Error("Referenced a label which was not set")
            }
            console.log(placeholder)
            for (let index = 0; index < 4; index++) {
                programBytes[placeholder.ptr + index] = resolvedLabel.value[index];
            }
        }
        return programBytes;
    }

    // 32 Bit Addresses
    _packAddressPlaceholder(payload) {
        const placeholder = new Uint32Array([0]);
        const packedPlaceholder = new Uint8Array(placeholder.buffer);
        payload.push(packedPlaceholder[0], packedPlaceholder[1], packedPlaceholder[2], packedPlaceholder[3]);
    }

    // OPCODES (type, code) -> (UINT8, UINT8)
    _packOpCode(code, payload) {
        payload.push(ValueType.OP_CODE);
        payload.push(code);
    }

    // Number (type, value) -> (UINT8, F64)
    _packNumber(value, payload) {
        const code = new Uint8Array([ValueType.NUMBER]);

        const floatBytes = new Float64Array([value]);
        console.log(floatBytes.byteLength)
        var packedNumber = new Uint8Array(floatBytes.buffer);

        payload.push(code[0])
        payload.push(packedNumber[0], packedNumber[1], packedNumber[2], packedNumber[3]);
        payload.push(packedNumber[4], packedNumber[5], packedNumber[6], packedNumber[7]);
    }

    _packNumberRaw(value, payload) {
        const floatBytes = new Float64Array([value]);
        var packedNumber = new Uint8Array(floatBytes.buffer);
        payload.push(packedNumber[0], packedNumber[1], packedNumber[2], packedNumber[3]);
        payload.push(packedNumber[4], packedNumber[5], packedNumber[6], packedNumber[7]);
    }

    // STRING (type, size, bytes ..) UINT8, UINT32, UInt16
    _packString(str, payload) {
        const code = new Uint8Array([ValueType.STRING]);
        const length = new Uint8Array(new Uint32Array([str.length]).buffer);

        var buf = new ArrayBuffer(str.length * 2);
        var bufView = new Uint16Array(buf);

        for (var i = 0; i < str.length; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        const packedString = new Uint8Array(bufView.buffer);

        payload.push(code[0]);
        console.log(length)
        payload.push(length[0], length[1], length[2], length[3]);

        for (let index = 0; index < packedString.byteLength; index++) {
            payload.push(packedString[index]);
        }
    }

}

module.exports = { Compiler }