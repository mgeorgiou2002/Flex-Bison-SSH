import * as vscode from 'vscode';
import { extractBisonNonTerminals, extractBisonTokens } from '../utils/bisonParser';

export class FlexBisonCompletionProvider implements vscode.CompletionItemProvider {
   //Autocomplete
   
       provideCompletionItems(
           document: vscode.TextDocument,
           position: vscode.Position
       ): vscode.ProviderResult<vscode.CompletionItem[]> {
           const linePrefix = document.lineAt(position).text.substring(0, position.character);
           const text = document.getText();
           const items: vscode.CompletionItem[] = [];
   
           const addItem = (
               label: string,
               kind: vscode.CompletionItemKind,
               detail: string,
               documentation: string,
               insertText?: string,
               sortPrefix: string = '1'
           ) => {
               const item = new vscode.CompletionItem(label, kind);
               item.detail = detail;
               item.documentation = new vscode.MarkdownString(documentation);
               item.sortText = sortPrefix + label;
   
               if (insertText) {
                   item.insertText = new vscode.SnippetString(insertText);
               }
   
               items.push(item);
           };
   
           const isFlex = document.languageId === 'flex' || document.fileName.endsWith('.l');
           const isBison = document.languageId === 'bison' || document.fileName.endsWith('.y');
   
           // --- Static Flex suggestions ---
        if (isFlex) {
            addItem("%option", vscode.CompletionItemKind.Keyword, "Flex directive", "Lexer configuration directive.", "%option ", '0');
            addItem("%x", vscode.CompletionItemKind.Keyword, "Flex directive", "Declaration of an exclusive start condition.", "%x ${1:STATE}", '0');
            addItem("%s", vscode.CompletionItemKind.Keyword, "Flex directive", "Declaration of an inclusive start condition.", "%s ${1:STATE}", '0');
            addItem("BEGIN", vscode.CompletionItemKind.Function, "Flex macro", "Changes the start condition.", "BEGIN(${1:STATE});");
            addItem("ECHO", vscode.CompletionItemKind.Function, "Flex macro", "Prints yytext to the output.", "ECHO;");
            addItem("REJECT", vscode.CompletionItemKind.Function, "Flex macro", "Rejects the current rule.", "REJECT;");
            addItem("yytext", vscode.CompletionItemKind.Variable, "Flex variable", "The text of the token that was matched.");
            addItem("yyleng", vscode.CompletionItemKind.Variable, "Flex variable", "The length of yytext.");
            addItem("yywrap", vscode.CompletionItemKind.Function, "Flex function", "Function called at EOF.", "int yywrap(void) {\n\treturn 1;\n}");
            addItem("yylex", vscode.CompletionItemKind.Function, "Flex function", "The main lexer function.");
            addItem("yylineno", vscode.CompletionItemKind.Variable, "Flex variable", "Current line number.");
            addItem("yyin", vscode.CompletionItemKind.Variable, "Flex variable", "Lexer input stream.");
            addItem("yyout", vscode.CompletionItemKind.Variable, "Flex variable", "Lexer output stream.");}
            addItem("input", vscode.CompletionItemKind.Function, "Flex function", "Reads the next character from input.", "input();");
            addItem("unput", vscode.CompletionItemKind.Function, "Flex function", "Pushes a character back to the input stream.", "unput(${1:c});");
            addItem("yyrestart", vscode.CompletionItemKind.Function, "Flex function", "Restart scanning from a new file.", "yyrestart(${1:file});");
            addItem("YYSTART", vscode.CompletionItemKind.Variable, "Flex macro", "Current start condition.");
           // --- Static Bison suggestions ---
        if (isBison) {
            addItem("%token", vscode.CompletionItemKind.Keyword, "Bison directive", "Declaration of a terminal symbol.", "%token ${1:TOKEN_NAME}", '0');
            addItem("%type", vscode.CompletionItemKind.Keyword, "Bison directive", "Type declaration for a non-terminal.", "%type <${1:type}> ${2:nonterminal}", '0');
            addItem("%left", vscode.CompletionItemKind.Keyword, "Bison directive", "Left associativity.", "%left ${1:'+' '-'}", '0');
            addItem("%right", vscode.CompletionItemKind.Keyword, "Bison directive", "Right associativity.", "%right ${1:'^'}", '0');
            addItem("%nonassoc", vscode.CompletionItemKind.Keyword, "Bison directive", "Non-associative operators.", "%nonassoc ${1:OP}", '0');
            addItem("%start", vscode.CompletionItemKind.Keyword, "Bison directive", "Definition of the start rule.", "%start ${1:start_symbol}", '0');
            addItem("%union", vscode.CompletionItemKind.Keyword, "Bison directive", "Declaration of semantic value union.", "%union {\n\t${1:int num;}\n}", '0');
            addItem("%prec", vscode.CompletionItemKind.Keyword, "Bison directive", "Sets precedence for a rule.", "%prec ${1:UMINUS}", '0');
            addItem("%empty", vscode.CompletionItemKind.Keyword, "Bison directive", "Explicit empty production.", "%empty", '0');

            addItem("yylval", vscode.CompletionItemKind.Variable, "Bison variable", "Passes semantic value from lexer to parser.");
            addItem("yyparse", vscode.CompletionItemKind.Function, "Bison function", "The main parser function.");
            addItem("yyerror", vscode.CompletionItemKind.Function, "Bison function", "Parser error handling function.", "void yyerror(const char *s) {\n\tfprintf(stderr, \"%s\\n\", s);\n}");
            addItem("$$", vscode.CompletionItemKind.Variable, "Bison semantic value", "The value of the left-hand side of the rule.");
            addItem("$1", vscode.CompletionItemKind.Variable, "Bison semantic value", "The value of the first symbol in the rule.");
            addItem("$2", vscode.CompletionItemKind.Variable, "Bison semantic value", "The value of the second symbol in the rule.");
            addItem("$3", vscode.CompletionItemKind.Variable, "Bison semantic value", "The value of the third symbol in the rule.");

               // --- Dynamic Bison suggestions ---
               const tokens = extractBisonTokens(text);
               const nonTerminals = extractBisonNonTerminals(text);
   
               for (const token of tokens) {
                   addItem(
                       token,
                       vscode.CompletionItemKind.EnumMember,
                       "Bison token",
                       `Token δηλωμένο με %token: \`${token}\``,
                       undefined,
                       '1'
                   );
               }
   
               for (const nonTerminal of nonTerminals) {
                   addItem(
                       nonTerminal,
                       vscode.CompletionItemKind.Reference,
                       "Bison non-terminal",
                       `Non-terminal από grammar rule: \`${nonTerminal}\``,
                       undefined,
                       '2'
                   );
               }
           }
   
           // --- Common C helpers ---
            addItem("printf", vscode.CompletionItemKind.Function, "C stdlib", "Print formatted output.", "printf(\"${1:text}\\n\"${2});", '9');
            addItem("fprintf", vscode.CompletionItemKind.Function, "C stdlib", "Print to a stream.", "fprintf(stderr, \"${1:error}\\n\"${2});", '9');
            addItem("atoi", vscode.CompletionItemKind.Function, "C stdlib", "Convert string to int.", "atoi(${1:yytext})", '9');
            addItem("atof", vscode.CompletionItemKind.Function, "C stdlib", "Convert string to double.", "atof(${1:yytext})", '9');
            addItem("malloc", vscode.CompletionItemKind.Function, "C stdlib", "Allocate dynamic memory.", "malloc(${1:size})", '9');
            addItem("free", vscode.CompletionItemKind.Function, "C stdlib", "Free allocated memory.", "free(${1:ptr});", '9');
            addItem("strlen", vscode.CompletionItemKind.Function, "C stdlib", "Length of a string.", "strlen(${1:str})", '9');
            addItem("strcpy", vscode.CompletionItemKind.Function, "C stdlib", "Copy a string.", "strcpy(${1:dest}, ${2:src});", '9');
           // Αν ο χρήστης έχει αρχίσει με %, δείξε πρώτα directives
           if (linePrefix.trim().startsWith('%')) {
               return items.filter(item => item.label.toString().startsWith('%'));
           }
   
           // Αν ο χρήστης έχει αρχίσει με $, δείξε semantic values
           if (linePrefix.endsWith('$')) {
               return items.filter(item => item.label.toString().startsWith('$'));
           }
   
           return items;
       }
   }