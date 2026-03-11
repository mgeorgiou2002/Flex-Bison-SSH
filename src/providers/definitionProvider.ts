import * as vscode from 'vscode';
import {
    findBisonRuleDefinition,
    findBisonTokenDefinition,
    getWordRangeAtPosition
} from '../utils/bisonParser';

export class FlexBisonDefinitionProvider implements vscode.DefinitionProvider {
    provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
        const range = getWordRangeAtPosition(document, position);
        if (!range) return;

        const symbol = document.getText(range);

        const isBison = document.languageId === 'bison' || document.fileName.endsWith('.y');
        if (!isBison) return;

        const tokenDef = findBisonTokenDefinition(document, symbol);
        if (tokenDef) return tokenDef;

        const ruleDef = findBisonRuleDefinition(document, symbol);
        if (ruleDef) return ruleDef;

        return;
    }
}