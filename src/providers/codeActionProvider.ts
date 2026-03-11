import * as vscode from 'vscode';

export class FlexBisonActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = [];

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
                const removeDuplicate = createRemoveLineQuickFix(
                    document,
                    diagnostic,
                    `Remove duplicate token declaration '${duplicateToken}'`
                );
                if (removeDuplicate) {
                    actions.push(removeDuplicate);
                }
            }

            const unusedToken = parseUnusedTokenMessage(diagnostic.message);
if (unusedToken) {
    const removeUnused = createRemoveLineQuickFix(
        document,
        diagnostic,
        `Remove unused token declaration '${unusedToken}'`
    );

    if (removeUnused) {
        actions.push(removeUnused);
    }
}


        }

        return actions;
    }
}

function parseUndefinedSymbolMessage(message: string): string | null {
    const match = message.match(/^Undefined symbol '([A-Za-z_][A-Za-z0-9_]*)'$/);
    return match ? match[1] : null;
}

function parseDuplicateTokenMessage(message: string): string | null {
    const match = message.match(/^Duplicate token declaration '([A-Za-z_][A-Za-z0-9_]*)'$/);
    return match ? match[1] : null;
}

function createAddTokenQuickFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    symbol: string
): vscode.CodeAction {
    const action = new vscode.CodeAction(
        `Create %token ${symbol}`,
        vscode.CodeActionKind.QuickFix
    );

    action.diagnostics = [diagnostic];
    action.isPreferred = true;

    const edit = new vscode.WorkspaceEdit();
    const insertPosition = findTokenInsertionPosition(document);
    const insertText = `%token ${symbol}\n`;

    edit.insert(document.uri, insertPosition, insertText);
    action.edit = edit;

    return action;
}

function createRemoveLineQuickFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    title: string
): vscode.CodeAction | null {
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

function findTokenInsertionPosition(document: vscode.TextDocument): vscode.Position {
    for (let i = 0; i < document.lineCount; i++) {
        const text = document.lineAt(i).text;

        if (/^\s*%%\s*$/.test(text)) {
            return new vscode.Position(i, 0);
        }
    }

    return new vscode.Position(0, 0);
}

function parseUnusedTokenMessage(message: string): string | null {
    const match = message.match(/^Token '([A-Za-z_][A-Za-z0-9_]*)' is declared but never used$/);
    return match ? match[1] : null;
}