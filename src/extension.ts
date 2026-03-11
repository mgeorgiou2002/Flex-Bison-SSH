import * as vscode from 'vscode';
import { registerRunCommand } from './commands/run';
import { registerRegexTesterCommand } from './commands/regexTester';
import { registerGrammarGraphCommand } from './commands/grammarGraph';
import { registerLinting } from './lint/lint';
import { registerHoverProvider } from './providers/hoverProvider';
import { FlexBisonCompletionProvider } from './providers/completionProvider';
import { FlexBisonDefinitionProvider } from './providers/definitionProvider';
import { FlexBisonActionProvider } from './providers/codeActionProvider';
import { FlexBisonDocumentSymbolProvider } from './providers/documentSymbolProvider';
import { FlexBisonReferenceProvider } from './providers/referenceProvider';

export function activate(context: vscode.ExtensionContext) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('flex-bison');
    context.subscriptions.push(diagnosticCollection);

    registerLinting(context, diagnosticCollection);
    registerRunCommand(context, diagnosticCollection);
    registerRegexTesterCommand(context);
    registerGrammarGraphCommand(context);
    registerHoverProvider(context);

    const completionProvider = vscode.languages.registerCompletionItemProvider(
        ['flex', 'bison'],
        new FlexBisonCompletionProvider(),
        '%',
        '$'
    );

    const definitionProvider = vscode.languages.registerDefinitionProvider(
        ['bison'],
        new FlexBisonDefinitionProvider()
    );

    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        ['flex', 'bison'],
        new FlexBisonActionProvider(),
        {
            providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
        }
    );

    const documentSymbolProvider = vscode.languages.registerDocumentSymbolProvider(
        ['bison'],
        new FlexBisonDocumentSymbolProvider()
    );

    const referenceProvider = vscode.languages.registerReferenceProvider(
        ['bison'],
        new FlexBisonReferenceProvider()
    );

    context.subscriptions.push(completionProvider);
    context.subscriptions.push(definitionProvider);
    context.subscriptions.push(codeActionProvider);
    context.subscriptions.push(documentSymbolProvider);
    context.subscriptions.push(referenceProvider);
}

export function deactivate() {}