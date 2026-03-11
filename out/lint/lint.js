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
exports.lintDocument = lintDocument;
exports.registerLinting = registerLinting;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const paths_1 = require("../utils/paths");
const diagnostics_1 = require("./diagnostics");
const bisonSemanticDiagnostics_1 = require("./bisonSemanticDiagnostics");
function lintDocument(document, diagnosticCollection) {
    const filePath = document.uri.fsPath;
    const dir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    const tempFileName = `.tmp_${fileName}`;
    const tempCName = `.tmp_${fileName}.c`;
    const tempHName = `.tmp_${fileName}.h`;
    const tempFilePath = path.join(dir, tempFileName);
    const tempCPath = path.join(dir, tempCName);
    const tempHPath = path.join(dir, tempHName);
    const wslDir = (0, paths_1.winPathToWsl)(dir);
    try {
        fs.writeFileSync(tempFilePath, document.getText());
    }
    catch {
        return;
    }
    let command = '';
    if (fileName.endsWith('.l')) {
        command = `wsl bash -lc "cd '${wslDir}' && flex -o '${tempCName}' '${tempFileName}' && gcc -fsyntax-only -fdiagnostics-color=never '${tempCName}'"`;
    }
    else if (fileName.endsWith('.y')) {
        command = `wsl bash -lc "cd '${wslDir}' && bison -d -o '${tempCName}' '${tempFileName}' && gcc -fsyntax-only -fdiagnostics-color=never '${tempCName}'"`;
    }
    else {
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            return;
        }
    }
    (0, child_process_1.exec)(command, (_error, _stdout, stderr) => {
        const filesToClean = [tempFilePath, tempCPath, tempHPath];
        for (const file of filesToClean) {
            if (fs.existsSync(file)) {
                try {
                    fs.unlinkSync(file);
                }
                catch { }
            }
        }
        const semanticDiagnostics = (0, bisonSemanticDiagnostics_1.getBisonSemanticDiagnostics)(document);
        const compilerDiagnostics = stderr
            ? (0, diagnostics_1.updateDiagnostics)(stderr, document)
            : [];
        diagnosticCollection.set(document.uri, [
            ...compilerDiagnostics,
            ...semanticDiagnostics
        ]);
    });
}
function registerLinting(context, diagnosticCollection) {
    let lintTimeout;
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        const document = event.document;
        if (document.languageId !== 'flex' &&
            document.languageId !== 'bison' &&
            !document.fileName.endsWith('.l') &&
            !document.fileName.endsWith('.y')) {
            return;
        }
        if (lintTimeout) {
            clearTimeout(lintTimeout);
        }
        lintTimeout = setTimeout(() => {
            lintDocument(document, diagnosticCollection);
        }, 500);
    }));
}
//# sourceMappingURL=lint.js.map