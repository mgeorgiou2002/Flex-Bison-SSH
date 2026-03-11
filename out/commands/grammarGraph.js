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
exports.registerGrammarGraphCommand = registerGrammarGraphCommand;
const vscode = __importStar(require("vscode"));
function registerGrammarGraphCommand(context) {
    const disposable = vscode.commands.registerCommand('flex.showGrammarGraph', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Δεν υπάρχει ανοιχτό αρχείο.');
            return;
        }
        const document = editor.document;
        const isBison = document.languageId === 'bison' || document.fileName.endsWith('.y');
        if (!isBison) {
            vscode.window.showErrorMessage('Το Grammar Graph λειτουργεί μόνο σε αρχεία Bison (.y).');
            return;
        }
        const rules = parseGrammarRules(document);
        if (rules.length === 0) {
            vscode.window.showWarningMessage('Δεν βρέθηκαν grammar rules στο αρχείο.');
            return;
        }
        const tokenDefinitions = parseTokenDefinitions(document);
        const panel = vscode.window.createWebviewPanel('grammarGraph', `Grammar Graph: ${document.fileName.split(/[\\/]/).pop()}`, vscode.ViewColumn.Beside, {
            enableScripts: true
        });
        panel.webview.html = getGrammarGraphHtml(document, rules, tokenDefinitions);
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message || typeof message.type !== 'string' || typeof message.name !== 'string') {
                return;
            }
            const targetDoc = await vscode.workspace.openTextDocument(document.uri);
            const targetEditor = await vscode.window.showTextDocument(targetDoc, vscode.ViewColumn.One);
            if (message.type === 'goToRule') {
                const targetRule = rules.find(rule => rule.name === message.name);
                if (!targetRule) {
                    return;
                }
                const lineText = targetDoc.lineAt(targetRule.line).text;
                const match = lineText.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);
                let selectionStart = 0;
                let selectionEnd = 0;
                if (match) {
                    const symbolName = match[1];
                    const startChar = lineText.indexOf(symbolName);
                    if (startChar >= 0) {
                        selectionStart = startChar;
                        selectionEnd = startChar + symbolName.length;
                    }
                }
                const range = new vscode.Range(targetRule.line, selectionStart, targetRule.line, selectionEnd);
                targetEditor.selection = new vscode.Selection(range.start, range.end);
                targetEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                return;
            }
            if (message.type === 'goToToken') {
                const tokenDef = tokenDefinitions.find(token => token.name === message.name);
                if (!tokenDef) {
                    return;
                }
                const range = new vscode.Range(tokenDef.line, tokenDef.startChar, tokenDef.line, tokenDef.endChar);
                targetEditor.selection = new vscode.Selection(range.start, range.end);
                targetEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            }
        });
    });
    context.subscriptions.push(disposable);
}
function parseGrammarRules(document) {
    const lines = getSanitizedLines(document);
    let firstPercentPercent = -1;
    let secondPercentPercent = -1;
    for (let i = 0; i < lines.length; i++) {
        if (/^\s*%%\s*$/.test(lines[i])) {
            if (firstPercentPercent === -1) {
                firstPercentPercent = i;
            }
            else {
                secondPercentPercent = i;
                break;
            }
        }
    }
    if (firstPercentPercent === -1) {
        return [];
    }
    const grammarStart = firstPercentPercent + 1;
    const grammarEnd = secondPercentPercent === -1 ? lines.length - 1 : secondPercentPercent - 1;
    const declaredRules = new Set();
    const rules = [];
    for (let i = grammarStart; i <= grammarEnd; i++) {
        const match = lines[i].match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);
        if (match) {
            declaredRules.add(match[1]);
        }
    }
    let currentRuleName = null;
    let currentRuleLine = -1;
    let currentBody = [];
    const flushRule = () => {
        if (!currentRuleName || currentRuleLine === -1) {
            return;
        }
        const bodyText = currentBody.join('\n');
        const references = extractReferencesFromRuleBody(bodyText);
        rules.push({
            name: currentRuleName,
            references,
            line: currentRuleLine
        });
    };
    for (let i = grammarStart; i <= grammarEnd; i++) {
        const line = lines[i];
        const ruleStart = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);
        if (ruleStart) {
            flushRule();
            currentRuleName = ruleStart[1];
            currentRuleLine = i;
            const colonIndex = line.indexOf(':');
            const rest = colonIndex >= 0 ? line.slice(colonIndex + 1) : '';
            currentBody = [rest];
            if (line.includes(';')) {
                flushRule();
                currentRuleName = null;
                currentRuleLine = -1;
                currentBody = [];
            }
            continue;
        }
        if (currentRuleName) {
            currentBody.push(line);
            if (line.includes(';')) {
                flushRule();
                currentRuleName = null;
                currentRuleLine = -1;
                currentBody = [];
            }
        }
    }
    flushRule();
    return rules.map(rule => {
        const seen = new Set();
        const refs = [];
        for (const ref of rule.references) {
            if (ref === rule.name) {
                refs.push(ref);
                continue;
            }
            if (!seen.has(ref)) {
                seen.add(ref);
                refs.push(ref);
            }
        }
        return {
            name: rule.name,
            line: rule.line,
            references: refs.filter(ref => declaredRules.has(ref) || /^[A-Z_][A-Z0-9_]*$/.test(ref))
        };
    });
}
function parseTokenDefinitions(document) {
    const tokenDefinitions = [];
    for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
        const fullLine = document.lineAt(lineNum).text;
        const trimmed = fullLine.trim();
        const tokenDirectiveMatch = trimmed.match(/^%(token|left|right|nonassoc)\b/);
        if (!tokenDirectiveMatch) {
            continue;
        }
        const directiveMatch = fullLine.match(/^\s*%(token|left|right|nonassoc)\b(.*)$/);
        if (!directiveMatch) {
            continue;
        }
        const rest = directiveMatch[2].replace(/<[^>]+>/g, ' ');
        const regex = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
        let match;
        while ((match = regex.exec(rest)) !== null) {
            const name = match[0];
            const startChar = fullLine.indexOf(name, directiveMatch.index ?? 0);
            if (startChar < 0) {
                continue;
            }
            tokenDefinitions.push({
                name,
                line: lineNum,
                startChar,
                endChar: startChar + name.length
            });
        }
    }
    return tokenDefinitions;
}
function extractReferencesFromRuleBody(text) {
    let cleaned = text;
    cleaned = cleaned.replace(/\{[^}]*\}/g, ' ');
    cleaned = cleaned.replace(/'(?:\\.|[^'\\])+'/g, ' ');
    cleaned = cleaned.replace(/\$\$|\$\d+/g, ' ');
    cleaned = cleaned.replace(/\b%empty\b/g, ' ');
    cleaned = cleaned.replace(/\b%prec\b\s+[A-Za-z_][A-Za-z0-9_]*/g, ' ');
    cleaned = cleaned.replace(/[|;]/g, ' ');
    const refs = [];
    const regex = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
    let match;
    while ((match = regex.exec(cleaned)) !== null) {
        refs.push(match[0]);
    }
    return refs;
}
function getSanitizedLines(document) {
    const lines = [];
    let inBlockComment = false;
    for (let i = 0; i < document.lineCount; i++) {
        const original = document.lineAt(i).text;
        const sanitized = stripCommentsAndStrings(original, inBlockComment);
        inBlockComment = sanitized.blockCommentOpen;
        lines.push(sanitized.text);
    }
    return lines;
}
function stripCommentsAndStrings(line, wasInBlockComment) {
    let result = '';
    let i = 0;
    let inString = false;
    let inBlockComment = wasInBlockComment;
    while (i < line.length) {
        const ch = line[i];
        const next = i + 1 < line.length ? line[i + 1] : '';
        if (inBlockComment) {
            if (ch === '*' && next === '/') {
                inBlockComment = false;
                result += '  ';
                i += 2;
            }
            else {
                result += ' ';
                i++;
            }
            continue;
        }
        if (inString) {
            if (ch === '\\' && next) {
                result += '  ';
                i += 2;
                continue;
            }
            if (ch === '"') {
                inString = false;
            }
            result += ' ';
            i++;
            continue;
        }
        if (ch === '/' && next === '*') {
            inBlockComment = true;
            result += '  ';
            i += 2;
            continue;
        }
        if (ch === '/' && next === '/') {
            result += ' '.repeat(line.length - i);
            break;
        }
        if (ch === '"') {
            inString = true;
            result += ' ';
            i++;
            continue;
        }
        result += ch;
        i++;
    }
    return {
        text: result,
        blockCommentOpen: inBlockComment
    };
}
function getGrammarGraphHtml(document, rules, tokenDefinitions) {
    const allRuleNames = new Set(rules.map(r => r.name));
    const allTokenNames = new Set(tokenDefinitions.map(t => t.name));
    const nodeNames = new Set();
    for (const rule of rules) {
        nodeNames.add(rule.name);
        for (const ref of rule.references) {
            nodeNames.add(ref);
        }
    }
    const edgeList = [];
    for (const rule of rules) {
        for (const ref of rule.references) {
            edgeList.push(`${escapeHtml(rule.name)} → ${escapeHtml(ref)}`);
        }
    }
    const graphBlocks = rules.map(rule => {
        const refs = rule.references.length > 0
            ? rule.references.map(ref => {
                if (allRuleNames.has(ref)) {
                    const targetRule = rules.find(r => r.name === ref);
                    return clickableRuleNode(ref, targetRule?.line);
                }
                if (allTokenNames.has(ref)) {
                    const targetToken = tokenDefinitions.find(t => t.name === ref);
                    return clickableTokenNode(ref, targetToken?.line);
                }
                return `<div class="node token-node">${escapeHtml(ref)}</div>`;
            }).join('<div class="connector">→</div>')
            : `<div class="node empty-node">∅</div>`;
        return `
            <div class="flow-row">
        ${clickableMainRuleNode(rule.name, rule.line)}               
            <div class="connector">→</div>
                <div class="flow-targets">${refs}</div>
            </div>
        `;
    }).join('\n');
    const ruleCards = rules.map(rule => {
        const refs = rule.references.length > 0
            ? rule.references.map(ref => {
                if (allRuleNames.has(ref)) {
                    const targetRule = rules.find(r => r.name === ref);
                    return clickableRuleChip(ref, targetRule?.line);
                }
                if (allTokenNames.has(ref)) {
                    const targetToken = tokenDefinitions.find(t => t.name === ref);
                    return clickableTokenChip(ref, targetToken?.line);
                }
                return `<span class="chip token-ref">${escapeHtml(ref)}</span>`;
            }).join(' ')
            : '<span class="empty">No dependencies</span>';
        return `
            <div class="card">
                <div class="card-title-row">
            ${clickableCardTitle(rule.name, rule.line)}  
                  <span class="line-badge">line ${rule.line + 1}</span>
                </div>
                <div class="arrow">depends on</div>
                <div class="refs">${refs}</div>
            </div>
        `;
    }).join('\n');
    const nodeList = [...nodeNames]
        .sort((a, b) => a.localeCompare(b))
        .map(name => {
        if (allRuleNames.has(name)) {
            const targetRule = rules.find(r => r.name === name);
            const title = buildRuleTitle(name, targetRule?.line);
            return `<span class="chip rule-ref clickable" data-kind="rule" data-name="${escapeAttribute(name)}" title="${title}">${escapeHtml(name)}</span>`;
        }
        if (allTokenNames.has(name)) {
            const targetToken = tokenDefinitions.find(t => t.name === name);
            const title = buildTokenTitle(name, targetToken?.line);
            return `<span class="chip token-ref clickable" data-kind="token" data-name="${escapeAttribute(name)}" title="${title}">${escapeHtml(name)}</span>`;
        }
        return `<span class="chip token-ref">${escapeHtml(name)}</span>`;
    })
        .join('');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Grammar Graph</title>
<style>
    body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-editor-foreground);
        background: var(--vscode-editor-background);
        padding: 20px;
    }

    h1, h2 {
        margin-bottom: 10px;
    }

    .subtitle {
        opacity: 0.8;
        margin-bottom: 20px;
    }

    .section {
        margin-top: 28px;
    }

    .help {
        opacity: 0.8;
        margin-top: 6px;
        font-size: 13px;
    }

    .flow-wrapper {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .flow-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        padding: 14px;
        border: 1px solid var(--vscode-panel-border);
        border-radius: 10px;
        background: var(--vscode-sideBar-background);
    }

    .flow-targets {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .node {
        padding: 8px 12px;
        border-radius: 999px;
        font-size: 13px;
        border: 1px solid var(--vscode-panel-border);
        user-select: none;
    }

    .main-node {
        font-weight: 700;
        background: rgba(100, 149, 237, 0.18);
    }

    .rule-node {
        background: rgba(80, 200, 120, 0.16);
    }

    .token-node {
        background: rgba(255, 196, 0, 0.14);
    }

    .empty-node {
        opacity: 0.7;
    }

    .connector, .arrow {
        opacity: 0.75;
        font-weight: 700;
    }

    .cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 14px;
    }

    .card {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 12px;
        padding: 14px;
        background: var(--vscode-sideBar-background);
    }

    .card-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
    }

    .card-title {
        font-weight: 700;
    }

    .line-badge {
        font-size: 12px;
        opacity: 0.75;
    }

    .refs {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
    }

    .chip {
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 12px;
        border: 1px solid var(--vscode-panel-border);
        user-select: none;
    }

    .rule-ref {
        background: rgba(80, 200, 120, 0.16);
    }

    .token-ref {
        background: rgba(255, 196, 0, 0.14);
    }

    .empty {
        opacity: 0.7;
    }

    .list-box {
        border: 1px solid var(--vscode-panel-border);
        border-radius: 12px;
        padding: 14px;
        background: var(--vscode-sideBar-background);
        line-height: 1.7;
        white-space: pre-wrap;
    }

    .nodes-box {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .clickable {
        cursor: pointer;
        transition: transform 0.08s ease, opacity 0.08s ease;
    }

    .clickable:hover {
        transform: translateY(-1px);
        opacity: 0.92;
    }

    .clickable:active {
        transform: translateY(0);
    }
</style>
</head>
<body>
    <h1>Grammar Graph</h1>
    <div class="subtitle">${escapeHtml(document.fileName)}</div>

    <div class="help">Click green nodes for rules and yellow nodes for token declarations.</div>

    <div class="section">
        <h2>Rule Dependency Flow</h2>
        <div class="flow-wrapper">
            ${graphBlocks}
        </div>
    </div>

    <div class="section">
        <h2>Rule Cards</h2>
        <div class="cards">
            ${ruleCards}
        </div>
    </div>

    <div class="section">
        <h2>All Nodes</h2>
        <div class="nodes-box">
            ${nodeList}
        </div>
    </div>

    <div class="section">
        <h2>Edge List</h2>
        <div class="list-box">${edgeList.join('<br>') || 'No edges found.'}</div>
    </div>

<script>
    const vscode = acquireVsCodeApi();

    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const kind = target.dataset.kind;
        const name = target.dataset.name;

        if (!kind || !name) {
            return;
        }

        if (kind === 'rule') {
            vscode.postMessage({
                type: 'goToRule',
                name
            });
            return;
        }

        if (kind === 'token') {
            vscode.postMessage({
                type: 'goToToken',
                name
            });
        }
    });
</script>
</body>
</html>`;
}
function clickableMainRuleNode(name, line) {
    return `
        <div
            class="node main-node clickable"
            data-kind="rule"
            data-name="${escapeAttribute(name)}"
            title="${buildRuleTitle(name, line)}"
        >
            ${escapeHtml(name)}
        </div>
    `;
}
function clickableRuleNode(name, line) {
    return `
        <div
            class="node rule-node clickable"
            data-kind="rule"
            data-name="${escapeAttribute(name)}"
            title="${buildRuleTitle(name, line)}"
        >
            ${escapeHtml(name)}
        </div>
    `;
}
function clickableTokenNode(name, line) {
    return `
        <div
            class="node token-node clickable"
            data-kind="token"
            data-name="${escapeAttribute(name)}"
            title="${buildTokenTitle(name, line)}"
        >
            ${escapeHtml(name)}
        </div>
    `;
}
function clickableRuleChip(name, line) {
    return `
        <span
            class="chip rule-ref clickable"
            data-kind="rule"
            data-name="${escapeAttribute(name)}"
            title="${buildRuleTitle(name, line)}"
        >
            ${escapeHtml(name)}
        </span>
    `;
}
function clickableTokenChip(name, line) {
    return `
        <span
            class="chip token-ref clickable"
            data-kind="token"
            data-name="${escapeAttribute(name)}"
            title="${buildTokenTitle(name, line)}"
        >
            ${escapeHtml(name)}
        </span>
    `;
}
function clickableCardTitle(name, line) {
    return `
        <span
            class="card-title clickable"
            data-kind="rule"
            data-name="${escapeAttribute(name)}"
            title="${buildRuleTitle(name, line)}"
        >
            ${escapeHtml(name)}
        </span>
    `;
}
function buildRuleTitle(name, line) {
    const safeName = escapeAttribute(name);
    const safeLine = line !== undefined ? String(line + 1) : 'unknown';
    return `Rule: ${safeName}&#10;Defined at line ${safeLine}&#10;Click to jump to definition`;
}
function buildTokenTitle(name, line) {
    const safeName = escapeAttribute(name);
    const safeLine = line !== undefined ? String(line + 1) : 'unknown';
    return `Token: ${safeName}&#10;Declared at line ${safeLine}&#10;Click to jump to declaration`;
}
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function escapeAttribute(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
//# sourceMappingURL=grammarGraph.js.map