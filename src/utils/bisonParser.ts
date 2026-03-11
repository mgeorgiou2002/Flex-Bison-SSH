import * as vscode from 'vscode';

export function extractBisonTokens(text: string): string[] {
    const tokens = new Set<string>();
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed.startsWith('%token')) {
            continue;
        }

        const rest = trimmed.replace(/^%token\s+/, '');
        const parts = rest.split(/\s+/);

        for (const part of parts) {
            if (part.startsWith('<') && part.endsWith('>')) {
                continue;
            }

            if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
                tokens.add(part);
            }
        }
    }

    return [...tokens];
}

export function extractBisonNonTerminals(text: string): string[] {
    const nonTerminals = new Set<string>();
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);
        if (match) {
            nonTerminals.add(match[1]);
        }
    }

    return [...nonTerminals];
}

export function getWordRangeAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
): vscode.Range | undefined {
    return document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
}

export function findBisonTokenDefinition(
    document: vscode.TextDocument,
    symbol: string
): vscode.Location | undefined {
    for (let i = 0; i < document.lineCount; i++) {
        const fullLine = document.lineAt(i).text;
        const trimmed = fullLine.trim();

        if (!trimmed.startsWith('%token')) {
            continue;
        }

        const rest = trimmed.replace(/^%token\s+/, '');
        const parts = rest.split(/\s+/);

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

            if (part === symbol) {
                const start = fullLine.indexOf(symbol);
                if (start !== -1) {
                    const range = new vscode.Range(i, start, i, start + symbol.length);
                    return new vscode.Location(document.uri, range);
                }
            }
        }
    }

    return undefined;
}

export function findBisonRuleDefinition(
    document: vscode.TextDocument,
    symbol: string
): vscode.Location | undefined {
    for (let i = 0; i < document.lineCount; i++) {
        const fullLine = document.lineAt(i).text;
        const match = fullLine.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);

        if (match && match[1] === symbol) {
            const start = fullLine.indexOf(symbol);
            if (start !== -1) {
                const range = new vscode.Range(i, start, i, start + symbol.length);
                return new vscode.Location(document.uri, range);
            }
        }
    }

    return undefined;
}