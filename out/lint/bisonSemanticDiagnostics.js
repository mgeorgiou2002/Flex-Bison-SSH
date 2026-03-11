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
exports.getBisonSemanticDiagnostics = getBisonSemanticDiagnostics;
const vscode = __importStar(require("vscode"));
function getBisonSemanticDiagnostics(document) {
    const diagnostics = [];
    const isBison = document.languageId === 'bison' || document.fileName.endsWith('.y');
    if (!isBison) {
        return diagnostics;
    }
    const lines = getSanitizedLines(document);
    const tokenDecls = new Map();
    const knownTokens = new Set();
    const ruleDecls = new Map();
    const ruleDefinitionsInOrder = [];
    const usages = [];
    let inGrammarSection = false;
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        if (/^\s*%%\s*$/.test(line)) {
            inGrammarSection = !inGrammarSection;
            continue;
        }
        if (!inGrammarSection) {
            collectTokenDeclarations(line, lineNum, tokenDecls, knownTokens);
        }
        else {
            collectRuleDefinition(line, lineNum, ruleDecls, ruleDefinitionsInOrder);
        }
    }
    inGrammarSection = false;
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        if (/^\s*%%\s*$/.test(line)) {
            inGrammarSection = !inGrammarSection;
            continue;
        }
        if (!inGrammarSection) {
            continue;
        }
        collectGrammarUsages(line, lineNum, usages);
    }
    // duplicate token declarations
    for (const [name, ranges] of tokenDecls.entries()) {
        if (ranges.length > 1) {
            for (let i = 1; i < ranges.length; i++) {
                diagnostics.push(new vscode.Diagnostic(ranges[i], `Duplicate token declaration '${name}'`, vscode.DiagnosticSeverity.Warning));
            }
        }
    }
    // duplicate rule definitions
    for (const [name, ranges] of ruleDecls.entries()) {
        if (ranges.length > 1) {
            for (let i = 1; i < ranges.length; i++) {
                diagnostics.push(new vscode.Diagnostic(ranges[i], `Duplicate rule definition '${name}'`, vscode.DiagnosticSeverity.Warning));
            }
        }
    }
    const declaredTokens = knownTokens;
    const declaredRules = new Set(ruleDecls.keys());
    // undefined symbol usages
    for (const usage of usages) {
        if (declaredTokens.has(usage.name) || declaredRules.has(usage.name)) {
            continue;
        }
        diagnostics.push(new vscode.Diagnostic(usage.range, `Undefined symbol '${usage.name}'`, vscode.DiagnosticSeverity.Error));
    }
    const usedSymbolNames = new Set(usages.map(u => u.name));
    // unused tokens
    for (const [name, ranges] of tokenDecls.entries()) {
        if (usedSymbolNames.has(name)) {
            continue;
        }
        if (ranges.length !== 1) {
            continue;
        }
        diagnostics.push(new vscode.Diagnostic(ranges[0], `Token '${name}' is declared but never used`, vscode.DiagnosticSeverity.Warning));
    }
    // unused rules
    const startRuleName = ruleDefinitionsInOrder.length > 0
        ? ruleDefinitionsInOrder[0].name
        : null;
    const warnedUnusedRules = new Set();
    for (const ruleDef of ruleDefinitionsInOrder) {
        if (ruleDef.name === startRuleName) {
            continue;
        }
        if (usedSymbolNames.has(ruleDef.name)) {
            continue;
        }
        if (warnedUnusedRules.has(ruleDef.name)) {
            continue;
        }
        warnedUnusedRules.add(ruleDef.name);
        diagnostics.push(new vscode.Diagnostic(ruleDef.range, `Rule '${ruleDef.name}' is defined but never used`, vscode.DiagnosticSeverity.Warning));
    }
    return diagnostics;
}
function collectTokenDeclarations(line, lineNum, tokenDecls, knownTokens) {
    const tokenDirective = line.match(/^\s*%token\b(.*)$/);
    const precedenceDirective = line.match(/^\s*%(left|right|nonassoc)\b(.*)$/);
    if (!tokenDirective && !precedenceDirective) {
        return;
    }
    const isRealTokenDeclaration = !!tokenDirective;
    const rest = tokenDirective ? tokenDirective[1] : precedenceDirective[2];
    const cleanedRest = rest.replace(/<[^>]+>/g, ' ');
    const regex = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
    let tokenMatch;
    while ((tokenMatch = regex.exec(cleanedRest)) !== null) {
        const name = tokenMatch[0];
        const directiveMatch = tokenDirective ?? precedenceDirective;
        const start = directiveMatch
            ? line.indexOf(name, directiveMatch.index ?? 0)
            : -1;
        if (start < 0) {
            continue;
        }
        knownTokens.add(name);
        if (!isRealTokenDeclaration) {
            continue;
        }
        const range = new vscode.Range(lineNum, start, lineNum, start + name.length);
        if (!tokenDecls.has(name)) {
            tokenDecls.set(name, []);
        }
        tokenDecls.get(name).push(range);
    }
}
function collectRuleDefinition(line, lineNum, ruleDecls, ruleDefinitionsInOrder) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (!match) {
        return;
    }
    const name = match[1];
    const start = line.indexOf(name);
    if (start < 0) {
        return;
    }
    const range = new vscode.Range(lineNum, start, lineNum, start + name.length);
    if (!ruleDecls.has(name)) {
        ruleDecls.set(name, []);
    }
    ruleDecls.get(name).push(range);
    ruleDefinitionsInOrder.push({ name, range });
}
function collectGrammarUsages(line, lineNum, usages) {
    const ruleDefMatch = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    let searchStart = 0;
    if (ruleDefMatch) {
        const colonIndex = line.indexOf(':');
        if (colonIndex >= 0) {
            searchStart = colonIndex + 1;
        }
    }
    let text = line.slice(searchStart);
    // ΑΦΑΙΡΕΣΗ ACTION BLOCKS { ... }
    text = text.replace(/\{[^}]*\}/g, ' ');
    // αγνόησε character literals όπως '+' '\n'
    text = text.replace(/'(?:\\.|[^'\\])+'/g, ' ');
    // ΑΦΑΙΡΕΣΗ $1 $$ κλπ
    text = text.replace(/\$\$|\$\d+/g, ' ');
    const regex = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const name = match[0];
        const absoluteStart = searchStart + match.index;
        usages.push({
            name,
            range: new vscode.Range(lineNum, absoluteStart, lineNum, absoluteStart + name.length)
        });
    }
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
//# sourceMappingURL=bisonSemanticDiagnostics.js.map