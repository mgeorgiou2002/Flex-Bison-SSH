"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHoverProvider = registerHoverProvider;
const vscode = __importStar(require("vscode"));
function registerHoverProvider(context) {
    // --- 4. Hover Provider ---
    const hoverDictionary = {
        // --- Basic Flex ---
        "yytext": "**Type:** `char *`\n\n**Description:** Contains the text of the token that was just recognized.\n\n**Example:**\n\n    [0-9]+  { printf(\"Found: %s\", yytext); }",
        "yyleng": "**Type:** `int`\n\n**Description:** Contains the length (number of characters) of `yytext`.\n\n**Example:**\n\n    [a-z]+  { printf(\"Length: %d\", yyleng); }",
        "yywrap": "**Type:** `int yywrap(void)`\n\n**Description:** Automatically called at end of file (EOF). If it returns 1, scanning stops. If 0, scanning continues (e.g., for another file).\n\n**Example:**\n\n    int yywrap() { return 1; }",
        "yylex": "**Type:** `int yylex(void)`\n\n**Description:** The lexer function. Reads input and returns the next token.",
        "%option": "**Flex Directive**\n\n**Description:** Configures the behavior of the lexer.\n\n**Example:**\n\n    %option noyywrap",
        "BEGIN": "**Flex Command (Macro)**\n\n**Description:** Changes the current start condition (state) of the lexer.\n\n**Example:**\n\n    \"/*\"  { BEGIN(COMMENT); }",
        "ECHO": "**Flex Command (Macro)**\n\n**Description:** Copies the contents of `yytext` to the standard output (`yyout`).",
        "REJECT": "**Flex Command (Macro)**\n\n**Description:** Rejects the current rule and searches for the next best match (longest match).",
        "yylineno": "**Type:** `int`\n\n**Description:** Keeps track of the current line number. (Requires `%option yylineno`).",
        "yyin": "**Type:** `FILE *`\n\n**Description:** File pointer from which the lexer reads input (default is `stdin`).\n\n**Example:**\n\n    yyin = fopen(\"input.txt\", \"r\");",
        "yyout": "**Type:** `FILE *`\n\n**Description:** File pointer where the lexer writes output (default is `stdout`).",
        "%x": "**Flex Directive**\n\n**Description:** Declares exclusive start conditions.\n\n**Example:**\n\n    %x STRING_STATE",
        "%s": "**Flex Directive**\n\n**Description:** Declares inclusive start conditions.",
        // --- Basic Bison ---
        "yylval": "**Type:** `YYSTYPE`\n\n**Description:** Global variable used to pass semantic values from Flex to Bison.\n\n**Example:**\n\n    [0-9]+  { yylval.num = atoi(yytext); return NUMBER; }",
        "yyerror": "**Type:** `void yyerror(const char *s)`\n\n**Description:** Automatically called by Bison when a syntax error is detected.",
        "yyparse": "**Type:** `int yyparse(void)`\n\n**Description:** The main Bison function. Calls `yylex` to analyze the syntax.",
        "%token": "**Bison Directive**\n\n**Description:** Declares a terminal symbol (returned from Flex).\n\n**Example:**\n\n    %token INTEGER FLOAT",
        "%type": "**Bison Directive**\n\n**Description:** Specifies the data type (from `%union`) returned by a non-terminal symbol.\n\n**Example:**\n\n    %type <val> expr",
        "%left": "**Bison Directive**\n\n**Description:** Declares left associativity for operators.\n\n**Example:**\n\n    %left '+' '-'",
        "%right": "**Bison Directive**\n\n**Description:** Declares right associativity for operators (e.g., exponentiation).\n\n**Example:**\n\n    %right '^'",
        "%nonassoc": "**Bison Directive**\n\n**Description:** Declares that operators cannot be chained (e.g., `a < b < c` is invalid).",
        "%start": "**Bison Directive**\n\n**Description:** Explicitly defines which rule is the start symbol (if it is not the first rule).",
        "%prec": "**Bison Directive**\n\n**Description:** Changes the precedence of a rule (often used for unary minus `-`).\n\n**Example:**\n\n    expr: '-' expr %prec UMINUS",
        "%empty": "**Bison Directive**\n\n**Description:** Explicitly declares an empty production (ε). Makes the grammar clearer and avoids warnings.",
        "$$": "**Semantic Value (Bison)**\n\n**Description:** The variable where the result of the current rule is stored.\n\n**Example:**\n\n    expr: expr '+' expr { $$ = $1 + $3; }",
        "$1": "**Semantic Value (Bison)**\n\n**Description:** The value of the **1st** symbol on the right-hand side of the rule.",
        "$2": "**Semantic Value (Bison)**\n\n**Description:** The value of the **2nd** symbol on the right-hand side of the rule.",
        "$3": "**Semantic Value (Bison)**\n\n**Description:** The value of the **3rd** symbol on the right-hand side of the rule.",
        // --- Basic C / Standard Library ---
        "printf": "**C Standard Library**\n\n**Description:** Prints formatted text to the standard output (stdout).\n\n**Example:**\n\n    printf(\"Read number: %d\", num);",
        "fprintf": "**C Standard Library**\n\n**Description:** Prints formatted text to a specific stream (such as the error stream `stderr`).\n\n**Example:**\n\n    fprintf(stderr, \"Syntax error!\");",
        "atoi": "**C Standard Library**\n\n**Description:** Converts a string to an integer (`int`). Often used to convert `yytext`.\n\n**Example:**\n\n    yylval.num = atoi(yytext);",
        "atof": "**C Standard Library**\n\n**Description:** Converts a string to a floating-point number (`double`).\n\n**Example:**\n\n    yylval.fval = atof(yytext);",
        "malloc": "**C Standard Library**\n\n**Description:** Dynamically allocates memory. Often used to store variable-length strings (such as variable names).\n\n**Example:**\n\n    yylval.str = malloc(strlen(yytext) + 1);",
        "free": "**C Standard Library**\n\n**Description:** Releases memory previously allocated with `malloc`.",
        "strcpy": "**C Standard Library**\n\n**Description:** Copies the contents of one string into another.\n\n**Example:**\n\n    strcpy(yylval.str, yytext);",
        "strcmp": "**C Standard Library**\n\n**Description:** Compares two strings. Returns `0` if they are identical.\n\n**Example:**\n\n    if (strcmp(yytext, \"if\") == 0) { ... }",
        "strlen": "**C Standard Library**\n\n**Description:** Returns the length of a string (number of characters).\n\n**Example:**\n\n    int len = strlen(yytext);",
        "fopen": "**C Standard Library**\n\n**Description:** Opens a file for reading or writing. Often used to set `yyin`.\n\n**Example:**\n\n    yyin = fopen(\"code.txt\", \"r\");",
        "exit": "**C Standard Library**\n\n**Description:** Immediately terminates the execution of the program.\n\n**Example:**\n\n    exit(1); // Terminate with error code",
        "return": "**C Keyword**\n\n**Description:** Returns from a function. In Flex it is constantly used to send the recognized token to Bison.\n\n**Example:**\n\n    return INTEGER;",
        "int": "**C Data Type**\n\n**Description:** Integer number. The most common type for counters and token return values.",
        "char": "**C Data Type**\n\n**Description:** A single character. An array or pointer of these (`char *`) forms a string.",
        "void": "**C Data Type**\n\n**Description:** Represents the absence of a value. It is commonly used as the return type of functions that do not return anything.\n\n**Example:**\n\n    void printMessage() {\n        printf(\"Hello World\");\n    }",
        "#include": "**C Preprocessor Directive**\n\n**Description:** Includes the contents of another file during compilation. It is commonly used to include standard libraries or header files.\n\n**Example:**\n\n    #include <stdio.h>\n    #include \"myheader.h\"",
        "include": "**C Preprocessor Directive**\n\n**Description:** Used with `#include` to include header files during compilation.\n\n**Example:**\n\n    #include <stdio.h>"
    };
    const hoverProvider = vscode.languages.registerHoverProvider(['flex', 'bison'], {
        provideHover(document, position) {
            const range = document.getWordRangeAtPosition(position, /([%a-zA-Z_][a-zA-Z0-9_]*|\$\$|\$[0-9]+)/);
            if (!range) {
                return;
            }
            let word = document.getText(range);
            if (word.match(/^\$[4-9]$|^\$[1-9][0-9]+$/)) {
                word = '$1';
            }
            if (hoverDictionary[word]) {
                const markdownString = new vscode.MarkdownString(hoverDictionary[word]);
                markdownString.isTrusted = true;
                return new vscode.Hover(markdownString);
            }
        }
    });
    context.subscriptions.push(hoverProvider);
}
//# sourceMappingURL=hoverProvider.js.map