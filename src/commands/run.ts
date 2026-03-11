import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';
import { findFlexBisonFiles } from '../utils/fileUtils';
import { winPathToWsl } from '../utils/paths';
import { updateDiagnostics } from '../lint/diagnostics';
import { getBisonSemanticDiagnostics } from '../lint/bisonSemanticDiagnostics';

export function registerRunCommand(
    context: vscode.ExtensionContext,
    diagnosticCollection: vscode.DiagnosticCollection
) {
    const run = vscode.commands.registerCommand('flex.run', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {return;}

        if (editor.document.isDirty) {
            await editor.document.save();
        }

        const filePath = editor.document.uri.fsPath;
        const dir = path.dirname(filePath);
        const wslDir = winPathToWsl(dir);

        const output = vscode.window.createOutputChannel('Flex/Bison Output');
        output.clear();
        output.show(true);
        diagnosticCollection.clear();

        const { lFiles, yFiles } = findFlexBisonFiles(dir);

        if (lFiles.length > 1 || yFiles.length > 1) {
            vscode.window.showErrorMessage(
                `Βρέθηκαν πολλά αρχεία: ${lFiles.length} .l και ${yFiles.length} .y. Πρέπει να υπάρχει το πολύ 1 από το καθένα.`
            );
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
        } else if (lFiles.length === 1 && yFiles.length === 0) {
            const lFile = lFiles[0];

            command = `wsl bash -lc "cd '${wslDir}' && flex '${lFile}' && gcc -fdiagnostics-color=never lex.yy.c -lfl -o program"`;
            mode = `Flex-only build (${lFile})`;
        } else if (yFiles.length === 1 && lFiles.length === 0) {
            const yFile = yFiles[0];
            const bisonBase = yFile.replace('.y', '.tab');

            command = `wsl bash -lc "cd '${wslDir}' && bison -d '${yFile}' && gcc -fdiagnostics-color=never '${bisonBase}.c' -o program"`;
            mode = `Bison-only build (${yFile})`;
        } else {
            vscode.window.showErrorMessage('Μη έγκυρος συνδυασμός αρχείων στον φάκελο.');
            return;
        }

        output.appendLine(`=== ${mode} ===`);
        output.appendLine(`Directory: ${dir}`);
        output.appendLine(`Command: ${command}`);
        output.appendLine('');

        exec(command, (error, stdout, stderr) => {
            const compilerDiagnostics = stderr
                ? updateDiagnostics(stderr, editor.document)
                : [];

            const semanticDiagnostics = getBisonSemanticDiagnostics(editor.document);

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
            } else {
                output.appendLine('\n❌ ERROR: Η μεταγλώττιση απέτυχε. Δείτε τα σφάλματα παραπάνω.');
            }
        });
    });

    context.subscriptions.push(run);
}