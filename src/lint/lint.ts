import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { winPathToWsl } from '../utils/paths';
import { updateDiagnostics } from './diagnostics';
import { getBisonSemanticDiagnostics } from './bisonSemanticDiagnostics';

export function lintDocument(
    document: vscode.TextDocument,
    diagnosticCollection: vscode.DiagnosticCollection
) {
    const filePath = document.uri.fsPath;
    const dir = path.dirname(filePath);
    const fileName = path.basename(filePath);

    const tempFileName = `.tmp_${fileName}`;
    const tempCName = `.tmp_${fileName}.c`;
    const tempHName = `.tmp_${fileName}.h`;

    const tempFilePath = path.join(dir, tempFileName);
    const tempCPath = path.join(dir, tempCName);
    const tempHPath = path.join(dir, tempHName);
    const wslDir = winPathToWsl(dir);

    try {
        fs.writeFileSync(tempFilePath, document.getText());
    } catch {
        return;
    }

    let command = '';
    if (fileName.endsWith('.l')) {
        command = `wsl bash -lc "cd '${wslDir}' && flex -o '${tempCName}' '${tempFileName}' && gcc -fsyntax-only -fdiagnostics-color=never '${tempCName}'"`;
    } else if (fileName.endsWith('.y')) {
        command = `wsl bash -lc "cd '${wslDir}' && bison -d -o '${tempCName}' '${tempFileName}' && gcc -fsyntax-only -fdiagnostics-color=never '${tempCName}'"`;
    } else {
        if (fs.existsSync(tempFilePath)){ 
            fs.unlinkSync(tempFilePath);
        return;}
    }

    exec(command, (_error, _stdout, stderr) => {
        const filesToClean = [tempFilePath, tempCPath, tempHPath];

        for (const file of filesToClean) {
            if (fs.existsSync(file)) {
                try {
                    fs.unlinkSync(file);
                } catch {}
            }
        }

        const semanticDiagnostics = getBisonSemanticDiagnostics(document);
        const compilerDiagnostics = stderr
            ? updateDiagnostics(stderr, document)
            : [];

        diagnosticCollection.set(document.uri, [
            ...compilerDiagnostics,
            ...semanticDiagnostics
        ]);
    });
}

export function registerLinting(
    context: vscode.ExtensionContext,
    diagnosticCollection: vscode.DiagnosticCollection
) {
    let lintTimeout: NodeJS.Timeout | undefined;

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            const document = event.document;

            if (
                document.languageId !== 'flex' &&
                document.languageId !== 'bison' &&
                !document.fileName.endsWith('.l') &&
                !document.fileName.endsWith('.y')
            ) {
                return;
            }

            if (lintTimeout) {
                clearTimeout(lintTimeout);
            }

            lintTimeout = setTimeout(() => {
                lintDocument(document, diagnosticCollection);
            }, 500);
        })
    );
}