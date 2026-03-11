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
exports.FlexBisonDocumentSymbolProvider = void 0;
const vscode = __importStar(require("vscode"));
class FlexBisonDocumentSymbolProvider {
    provideDocumentSymbols(document, _token) {
        const isBison = document.languageId === 'bison' || document.fileName.endsWith('.y');
        if (!isBison) {
            return [];
        }
        const rootSymbols = [];
        const declarationsChildren = [];
        const grammarChildren = [];
        const userCodeChildren = [];
        let firstPercentPercentLine = -1;
        let secondPercentPercentLine = -1;
        for (let i = 0; i < document.lineCount; i++) {
            const text = document.lineAt(i).text.trim();
            if (text === '%%') {
                if (firstPercentPercentLine === -1) {
                    firstPercentPercentLine = i;
                }
                else {
                    secondPercentPercentLine = i;
                    break;
                }
            }
        }
        const declarationsStart = 0;
        const declarationsEnd = firstPercentPercentLine !== -1 ? firstPercentPercentLine : document.lineCount - 1;
        const grammarStart = firstPercentPercentLine !== -1 ? firstPercentPercentLine + 1 : -1;
        const grammarEnd = secondPercentPercentLine !== -1
            ? secondPercentPercentLine - 1
            : firstPercentPercentLine !== -1
                ? document.lineCount - 1
                : -1;
        const userCodeStart = secondPercentPercentLine !== -1 ? secondPercentPercentLine + 1 : -1;
        const userCodeEnd = secondPercentPercentLine !== -1 ? document.lineCount - 1 : -1;
        // -----------------------------
        // 1. Declarations section symbols
        // -----------------------------
        for (let i = declarationsStart; i <= declarationsEnd && i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text;
            // %token ...
            const tokenMatch = lineText.match(/^\s*%token\s+(.*)$/);
            if (tokenMatch) {
                const tokenRest = tokenMatch[1].trim();
                const parts = tokenRest.split(/\s+/);
                for (const part of parts) {
                    if (/^<.*>$/.test(part)) {
                        continue;
                    }
                    if (/^'.*'$/.test(part)) {
                        continue;
                    }
                    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
                        continue;
                    }
                    const startChar = lineText.indexOf(part);
                    if (startChar === -1) {
                        continue;
                    }
                    declarationsChildren.push(new vscode.DocumentSymbol(part, '%token', vscode.SymbolKind.EnumMember, new vscode.Range(i, 0, i, lineText.length), new vscode.Range(i, startChar, i, startChar + part.length)));
                }
            }
            // %type <...> a b c
            const typeMatch = lineText.match(/^\s*%type\s+(.*)$/);
            if (typeMatch) {
                const typeRest = typeMatch[1].trim();
                const parts = typeRest.split(/\s+/);
                for (const part of parts) {
                    if (/^<.*>$/.test(part)) {
                        continue;
                    }
                    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
                        continue;
                    }
                    const startChar = lineText.indexOf(part);
                    if (startChar === -1) {
                        continue;
                    }
                    declarationsChildren.push(new vscode.DocumentSymbol(part, '%type', vscode.SymbolKind.TypeParameter, new vscode.Range(i, 0, i, lineText.length), new vscode.Range(i, startChar, i, startChar + part.length)));
                }
            }
            // %start ...
            const startMatch = lineText.match(/^\s*%start\s+([A-Za-z_][A-Za-z0-9_]*)/);
            if (startMatch) {
                const symbolName = startMatch[1];
                const startChar = lineText.indexOf(symbolName);
                declarationsChildren.push(new vscode.DocumentSymbol(symbolName, '%start', vscode.SymbolKind.Interface, new vscode.Range(i, 0, i, lineText.length), new vscode.Range(i, startChar, i, startChar + symbolName.length)));
            }
            // %union { ... }
            const unionMatch = lineText.match(/^\s*%union\b/);
            if (unionMatch) {
                let endLine = i;
                let endChar = lineText.length;
                for (let j = i; j < document.lineCount; j++) {
                    const currentLine = document.lineAt(j).text;
                    const closeBrace = currentLine.indexOf('}');
                    if (closeBrace !== -1) {
                        endLine = j;
                        endChar = closeBrace + 1;
                        break;
                    }
                }
                declarationsChildren.push(new vscode.DocumentSymbol('%union', 'Semantic value union', vscode.SymbolKind.Struct, new vscode.Range(i, 0, endLine, endChar), new vscode.Range(i, 0, i, lineText.length)));
            }
        }
        // -----------------------------
        // 2. Grammar rules symbols
        // -----------------------------
        if (grammarStart !== -1) {
            for (let i = grammarStart; i <= grammarEnd && i < document.lineCount; i++) {
                const lineText = document.lineAt(i).text;
                const match = lineText.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);
                if (!match) {
                    continue;
                }
                const symbolName = match[1];
                const startChar = lineText.indexOf(symbolName);
                if (startChar === -1) {
                    continue;
                }
                let endLine = i;
                let endChar = lineText.length;
                for (let j = i; j <= grammarEnd && j < document.lineCount; j++) {
                    const currentLine = document.lineAt(j).text;
                    const semicolonIndex = currentLine.indexOf(';');
                    if (semicolonIndex !== -1) {
                        endLine = j;
                        endChar = semicolonIndex + 1;
                        break;
                    }
                }
                grammarChildren.push(new vscode.DocumentSymbol(symbolName, 'Bison rule', vscode.SymbolKind.Function, new vscode.Range(i, 0, endLine, endChar), new vscode.Range(i, startChar, i, startChar + symbolName.length)));
            }
        }
        // -----------------------------
        // 3. User code section
        // -----------------------------
        if (userCodeStart !== -1) {
            for (let i = userCodeStart; i <= userCodeEnd && i < document.lineCount; i++) {
                const lineText = document.lineAt(i).text;
                // πολύ απλό detection για C-like function
                const functionMatch = lineText.match(/^\s*(?:int|void|char|float|double|long|short|FILE|static|const|unsigned|signed)[\w\s\*]*\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^;]*\)\s*\{?/);
                if (functionMatch) {
                    const functionName = functionMatch[1];
                    const startChar = lineText.indexOf(functionName);
                    if (startChar === -1) {
                        continue;
                    }
                    userCodeChildren.push(new vscode.DocumentSymbol(functionName, 'User C code', vscode.SymbolKind.Method, new vscode.Range(i, 0, i, lineText.length), new vscode.Range(i, startChar, i, startChar + functionName.length)));
                }
            }
        }
        // -----------------------------
        // 4. Root sections
        // -----------------------------
        if (firstPercentPercentLine !== -1) {
            const declarationsSection = new vscode.DocumentSymbol('Declarations', 'Bison declarations section', vscode.SymbolKind.Namespace, new vscode.Range(declarationsStart, 0, declarationsEnd, document.lineAt(Math.min(declarationsEnd, document.lineCount - 1)).text.length), new vscode.Range(declarationsStart, 0, declarationsStart, 1));
            declarationsSection.children = declarationsChildren;
            rootSymbols.push(declarationsSection);
        }
        else if (declarationsChildren.length > 0) {
            rootSymbols.push(...declarationsChildren);
        }
        if (grammarStart !== -1 && grammarEnd >= grammarStart) {
            const grammarSection = new vscode.DocumentSymbol('Grammar Rules', 'Bison grammar rules section', vscode.SymbolKind.Namespace, new vscode.Range(grammarStart, 0, grammarEnd, document.lineAt(Math.min(grammarEnd, document.lineCount - 1)).text.length), new vscode.Range(grammarStart, 0, grammarStart, 1));
            grammarSection.children = grammarChildren;
            rootSymbols.push(grammarSection);
        }
        else if (grammarChildren.length > 0) {
            rootSymbols.push(...grammarChildren);
        }
        if (userCodeStart !== -1 && userCodeEnd >= userCodeStart) {
            const userCodeSection = new vscode.DocumentSymbol('User Code', 'Bison user code section', vscode.SymbolKind.Namespace, new vscode.Range(userCodeStart, 0, userCodeEnd, document.lineAt(Math.min(userCodeEnd, document.lineCount - 1)).text.length), new vscode.Range(userCodeStart, 0, userCodeStart, 1));
            userCodeSection.children = userCodeChildren;
            rootSymbols.push(userCodeSection);
        }
        else if (userCodeChildren.length > 0) {
            rootSymbols.push(...userCodeChildren);
        }
        return rootSymbols;
    }
}
exports.FlexBisonDocumentSymbolProvider = FlexBisonDocumentSymbolProvider;
//# sourceMappingURL=documentSymbolProvider.js.map