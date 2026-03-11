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
exports.FlexBisonActionProvider = void 0;
const vscode = __importStar(require("vscode"));
class FlexBisonActionProvider {
    provideCodeActions(document, range, context, _token) {
        const actions = [];
        const isBison = document.languageId === 'bison' || document.fileName.endsWith('.y');
        if (!isBison) {
            return actions;
        }
        for (const diagnostic of context.diagnostics) {
            const undefinedSymbol = parseUndefinedSymbolMessage(diagnostic.message);
            if (undefinedSymbol) {
                actions.push(createAddTokenQuickFix(document, diagnostic, undefinedSymbol));
            }
            const duplicateToken = parseDuplicateTokenMessage(diagnostic.message);
            if (duplicateToken) {
                const removeDuplicate = createRemoveLineQuickFix(document, diagnostic, `Remove duplicate token declaration '${duplicateToken}'`);
                if (removeDuplicate) {
                    actions.push(removeDuplicate);
                }
            }
            const unusedToken = parseUnusedTokenMessage(diagnostic.message);
            if (unusedToken) {
                const removeUnused = createRemoveLineQuickFix(document, diagnostic, `Remove unused token declaration '${unusedToken}'`);
                if (removeUnused) {
                    actions.push(removeUnused);
                }
            }
        }
        return actions;
    }
}
exports.FlexBisonActionProvider = FlexBisonActionProvider;
function parseUndefinedSymbolMessage(message) {
    const match = message.match(/^Undefined symbol '([A-Za-z_][A-Za-z0-9_]*)'$/);
    return match ? match[1] : null;
}
function parseDuplicateTokenMessage(message) {
    const match = message.match(/^Duplicate token declaration '([A-Za-z_][A-Za-z0-9_]*)'$/);
    return match ? match[1] : null;
}
function createAddTokenQuickFix(document, diagnostic, symbol) {
    const action = new vscode.CodeAction(`Create %token ${symbol}`, vscode.CodeActionKind.QuickFix);
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    const edit = new vscode.WorkspaceEdit();
    const insertPosition = findTokenInsertionPosition(document);
    const insertText = `%token ${symbol}\n`;
    edit.insert(document.uri, insertPosition, insertText);
    action.edit = edit;
    return action;
}
function createRemoveLineQuickFix(document, diagnostic, title) {
    const line = diagnostic.range.start.line;
    if (line < 0 || line >= document.lineCount) {
        return null;
    }
    const textLine = document.lineAt(line);
    const deleteRange = textLine.rangeIncludingLineBreak;
    const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
    action.diagnostics = [diagnostic];
    const edit = new vscode.WorkspaceEdit();
    edit.delete(document.uri, deleteRange);
    action.edit = edit;
    return action;
}
function findTokenInsertionPosition(document) {
    for (let i = 0; i < document.lineCount; i++) {
        const text = document.lineAt(i).text;
        if (/^\s*%%\s*$/.test(text)) {
            return new vscode.Position(i, 0);
        }
    }
    return new vscode.Position(0, 0);
}
function parseUnusedTokenMessage(message) {
    const match = message.match(/^Token '([A-Za-z_][A-Za-z0-9_]*)' is declared but never used$/);
    return match ? match[1] : null;
}
//# sourceMappingURL=codeActionProvider.js.map