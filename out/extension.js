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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const run_1 = require("./commands/run");
const regexTester_1 = require("./commands/regexTester");
const grammarGraph_1 = require("./commands/grammarGraph");
const lint_1 = require("./lint/lint");
const hoverProvider_1 = require("./providers/hoverProvider");
const completionProvider_1 = require("./providers/completionProvider");
const definitionProvider_1 = require("./providers/definitionProvider");
const codeActionProvider_1 = require("./providers/codeActionProvider");
const documentSymbolProvider_1 = require("./providers/documentSymbolProvider");
const referenceProvider_1 = require("./providers/referenceProvider");
function activate(context) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('flex-bison');
    context.subscriptions.push(diagnosticCollection);
    (0, lint_1.registerLinting)(context, diagnosticCollection);
    (0, run_1.registerRunCommand)(context, diagnosticCollection);
    (0, regexTester_1.registerRegexTesterCommand)(context);
    (0, grammarGraph_1.registerGrammarGraphCommand)(context);
    (0, hoverProvider_1.registerHoverProvider)(context);
    const completionProvider = vscode.languages.registerCompletionItemProvider(['flex', 'bison'], new completionProvider_1.FlexBisonCompletionProvider(), '%', '$');
    const definitionProvider = vscode.languages.registerDefinitionProvider(['bison'], new definitionProvider_1.FlexBisonDefinitionProvider());
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(['flex', 'bison'], new codeActionProvider_1.FlexBisonActionProvider(), {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
    });
    const documentSymbolProvider = vscode.languages.registerDocumentSymbolProvider(['bison'], new documentSymbolProvider_1.FlexBisonDocumentSymbolProvider());
    const referenceProvider = vscode.languages.registerReferenceProvider(['bison'], new referenceProvider_1.FlexBisonReferenceProvider());
    context.subscriptions.push(completionProvider);
    context.subscriptions.push(definitionProvider);
    context.subscriptions.push(codeActionProvider);
    context.subscriptions.push(documentSymbolProvider);
    context.subscriptions.push(referenceProvider);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map