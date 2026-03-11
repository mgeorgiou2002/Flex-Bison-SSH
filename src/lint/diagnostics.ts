import * as vscode from 'vscode';

export function updateDiagnostics(
    stderr: string,
    document: vscode.TextDocument
): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    const cleanStderr = stderr.replace(/\x1b\[[0-9;]*m/g, '');
    const lines = cleanStderr.split('\n');

    const errorRegex = /([^:\\/]+):(\d+)(?:[.:\d-]+)?:\s*(.*)/i;

    for (const line of lines) {
        if (!line.trim()) {
            continue;
        }

        const match = line.match(errorRegex);
        if (!match) {
            continue;
        }

        const lineNum = Math.max(0, parseInt(match[2], 10) - 1);
        const message = match[3].trim();

        if (lineNum >= document.lineCount) {
            continue;
        }

        const textLine = document.lineAt(lineNum);
        const range = new vscode.Range(lineNum, 0, lineNum, textLine.text.length);
        const severity = line.toLowerCase().includes('warning')
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Error;

        diagnostics.push(new vscode.Diagnostic(range, message, severity));
    }

    return diagnostics;
}