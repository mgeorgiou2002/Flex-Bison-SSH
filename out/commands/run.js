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
exports.registerRunCommand = registerRunCommand;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fileUtils_1 = require("../utils/fileUtils");
const paths_1 = require("../utils/paths");
const diagnostics_1 = require("../lint/diagnostics");
const bisonSemanticDiagnostics_1 = require("../lint/bisonSemanticDiagnostics");
function registerRunCommand(context, diagnosticCollection) {
    const run = vscode.commands.registerCommand('flex.run', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        if (editor.document.isDirty) {
            await editor.document.save();
        }
        const filePath = editor.document.uri.fsPath;
        const dir = path.dirname(filePath);
        const wslDir = (0, paths_1.winPathToWsl)(dir);
        const output = vscode.window.createOutputChannel('Flex/Bison Output');
        output.clear();
        output.show(true);
        diagnosticCollection.clear();
        const { lFiles, yFiles } = (0, fileUtils_1.findFlexBisonFiles)(dir);
        if (lFiles.length > 1 || yFiles.length > 1) {
            vscode.window.showErrorMessage(`Βρέθηκαν πολλά αρχεία: ${lFiles.length} .l και ${yFiles.length} .y. Πρέπει να υπάρχει το πολύ 1 από το καθένα.`);
            return;
        }
        if (lFiles.length === 0 && yFiles.length === 0) {
            vscode.window.showErrorMessage('Δεν βρέθηκε κανένα αρχείο .l ή .y στον φάκελο.');
            return;
        }
        let command = '';
        let mode = '';
        if (lFiles.length === 1 && yFiles.length === 1) {
            const lFile = lFiles[0];
            const yFile = yFiles[0];
            const bisonBase = yFile.replace('.y', '.tab');
            command = `wsl bash -lc "cd '${wslDir}' && bison -d '${yFile}' && flex '${lFile}' && gcc -fdiagnostics-color=never '${bisonBase}.c' lex.yy.c -lfl -o program"`;
            mode = `Combined build (${lFile} + ${yFile})`;
        }
        else if (lFiles.length === 1 && yFiles.length === 0) {
            const lFile = lFiles[0];
            command = `wsl bash -lc "cd '${wslDir}' && flex '${lFile}' && gcc -fdiagnostics-color=never lex.yy.c -lfl -o program"`;
            mode = `Flex-only build (${lFile})`;
        }
        else if (yFiles.length === 1 && lFiles.length === 0) {
            const yFile = yFiles[0];
            const bisonBase = yFile.replace('.y', '.tab');
            command = `wsl bash -lc "cd '${wslDir}' && bison -d '${yFile}' && gcc -fdiagnostics-color=never '${bisonBase}.c' -o program"`;
            mode = `Bison-only build (${yFile})`;
        }
        else {
            vscode.window.showErrorMessage('Μη έγκυρος συνδυασμός αρχείων στον φάκελο.');
            return;
        }
        output.appendLine(`=== ${mode} ===`);
        output.appendLine(`Directory: ${dir}`);
        output.appendLine(`Command: ${command}`);
        output.appendLine('');
        (0, child_process_1.exec)(command, (error, stdout, stderr) => {
            const compilerDiagnostics = stderr
                ? (0, diagnostics_1.updateDiagnostics)(stderr, editor.document)
                : [];
            const semanticDiagnostics = (0, bisonSemanticDiagnostics_1.getBisonSemanticDiagnostics)(editor.document);
            diagnosticCollection.set(editor.document.uri, [
                ...compilerDiagnostics,
                ...semanticDiagnostics
            ]);
            if (stdout) {
                output.appendLine('=== STDOUT ===');
                output.appendLine(stdout);
            }
            if (stderr) {
                output.appendLine('=== STDERR ===');
                output.appendLine(stderr);
            }
            if (!error) {
                vscode.window.showInformationMessage('Επιτυχής μεταγλώττιση!');
                output.appendLine('\n✅ SUCCESS: Η μεταγλώττιση ολοκληρώθηκε με επιτυχία!');
            }
            else {
                output.appendLine('\n❌ ERROR: Η μεταγλώττιση απέτυχε. Δείτε τα σφάλματα παραπάνω.');
            }
        });
    });
    context.subscriptions.push(run);
}
//# sourceMappingURL=run.js.map