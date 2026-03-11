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
exports.FlexBisonReferenceProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const bisonParser_1 = require("../utils/bisonParser");
class FlexBisonReferenceProvider {
    async provideReferences(document, position, _context, _token) {
        const range = (0, bisonParser_1.getWordRangeAtPosition)(document, position);
        if (!range) {
            return [];
        }
        const symbol = document.getText(range);
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol)) {
            return [];
        }
        const isBison = isBisonDocument(document);
        const isFlex = isFlexDocument(document);
        if (!isBison && !isFlex) {
            return [];
        }
        const locations = [];
        if (isBison) {
            const analysis = analyzeBisonDocument(document);
            const symbolKind = detectSymbolKindAtPosition(document, position, analysis);
            // references μέσα στο ίδιο .y
            for (const occ of analysis.occurrences) {
                if (occ.name !== symbol) {
                    continue;
                }
                if (symbolKind !== 'unknown' && occ.kind !== symbolKind) {
                    continue;
                }
                locations.push(new vscode.Location(document.uri, occ.range));
            }
            // αν είναι token, ψάξε και σε .l / άλλα .y
            if (symbolKind === 'token') {
                const crossFileLocations = await findTokenReferencesInRelatedFiles(symbol, document.uri);
                locations.push(...crossFileLocations);
            }
            return dedupeLocations(locations);
        }
        if (isFlex) {
            const flexOccurrences = findTokenReferencesInFlexDocument(document, symbol);
            locations.push(...flexOccurrences.map(range => new vscode.Location(document.uri, range)));
            // Αν είναι UPPER_CASE symbol, θεώρησέ το πιθανό token και ψάξε και σε .y / άλλα .l
            if (/^[A-Z_][A-Z0-9_]*$/.test(symbol)) {
                const crossFileLocations = await findTokenReferencesInRelatedFiles(symbol, document.uri);
                locations.push(...crossFileLocations);
            }
            return dedupeLocations(locations);
        }
        return [];
    }
}
exports.FlexBisonReferenceProvider = FlexBisonReferenceProvider;
function isBisonDocument(document) {
    return document.languageId === 'bison' || document.fileName.endsWith('.y');
}
function isFlexDocument(document) {
    return document.languageId === 'flex' || document.fileName.endsWith('.l');
}
async function findTokenReferencesInRelatedFiles(symbol, currentUri) {
    const locations = [];
    const relatedFiles = await findRelatedFlexBisonFiles(currentUri);
    for (const uri of relatedFiles) {
        try {
            if (uri.toString() === currentUri.toString()) {
                continue;
            }
            const doc = await vscode.workspace.openTextDocument(uri);
            if (isBisonDocument(doc)) {
                const analysis = analyzeBisonDocument(doc);
                for (const occ of analysis.occurrences) {
                    if (occ.name === symbol && occ.kind === 'token') {
                        locations.push(new vscode.Location(doc.uri, occ.range));
                    }
                }
            }
            else if (isFlexDocument(doc)) {
                const ranges = findTokenReferencesInFlexDocument(doc, symbol);
                for (const range of ranges) {
                    locations.push(new vscode.Location(doc.uri, range));
                }
            }
        }
        catch {
            // ignore unreadable files
        }
    }
    return locations;
}
function findTokenReferencesInFlexDocument(document, symbol) {
    const lines = getSanitizedLines(document);
    const ranges = [];
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        // Για αρχή πιάνουμε κυρίως:
        // return TOKEN;
        // return(TOKEN);
        // TOKEN ως ολόκληρη λέξη μέσα σε action block
        const regex = new RegExp(`\\b${escapeRegExp(symbol)}\\b`, 'g');
        let match;
        while ((match = regex.exec(line)) !== null) {
            const start = match.index;
            const end = start + symbol.length;
            ranges.push(new vscode.Range(lineNum, start, lineNum, end));
        }
    }
    return ranges;
}
function analyzeBisonDocument(document) {
    const tokenNames = new Set();
    const ruleNames = new Set();
    const occurrences = [];
    const lines = getSanitizedLines(document);
    let inGrammarSection = false;
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        if (/^\s*%%\s*$/.test(line)) {
            inGrammarSection = !inGrammarSection;
            continue;
        }
        if (!inGrammarSection) {
            parseTokenDeclarations(line, lineNum, tokenNames, occurrences);
        }
        else {
            parseRuleDefinition(line, lineNum, ruleNames, occurrences);
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
        parseGrammarReferences(line, lineNum, tokenNames, ruleNames, occurrences);
    }
    return { tokenNames, ruleNames, occurrences };
}
function parseTokenDeclarations(line, lineNum, tokenNames, occurrences) {
    const tokenDirectiveMatch = line.match(/^\s*%(token|left|right|nonassoc)\b(.*)$/);
    if (!tokenDirectiveMatch) {
        return;
    }
    const rest = tokenDirectiveMatch[2];
    const regex = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
    let match;
    while ((match = regex.exec(rest)) !== null) {
        const name = match[0];
        const absoluteStart = line.indexOf(name, tokenDirectiveMatch.index ?? 0);
        if (absoluteStart < 0) {
            continue;
        }
        tokenNames.add(name);
        occurrences.push({
            name,
            kind: 'token',
            range: new vscode.Range(lineNum, absoluteStart, lineNum, absoluteStart + name.length)
        });
    }
}
function parseRuleDefinition(line, lineNum, ruleNames, occurrences) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (!match) {
        return;
    }
    const name = match[1];
    const start = line.indexOf(name);
    if (start < 0) {
        return;
    }
    ruleNames.add(name);
    occurrences.push({
        name,
        kind: 'rule',
        range: new vscode.Range(lineNum, start, lineNum, start + name.length)
    });
}
function parseGrammarReferences(line, lineNum, tokenNames, ruleNames, occurrences) {
    const ruleDefMatch = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    let searchStart = 0;
    if (ruleDefMatch) {
        const colonIndex = line.indexOf(':');
        if (colonIndex >= 0) {
            searchStart = colonIndex + 1;
        }
    }
    const text = line.slice(searchStart);
    const regex = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const name = match[0];
        const absoluteStart = searchStart + match.index;
        let kind = 'unknown';
        if (tokenNames.has(name)) {
            kind = 'token';
        }
        else if (ruleNames.has(name)) {
            kind = 'rule';
        }
        else {
            continue;
        }
        occurrences.push({
            name,
            kind,
            range: new vscode.Range(lineNum, absoluteStart, lineNum, absoluteStart + name.length)
        });
    }
}
function detectSymbolKindAtPosition(document, position, analysis) {
    for (const occ of analysis.occurrences) {
        if (occ.range.contains(position)) {
            return occ.kind;
        }
    }
    const wordRange = (0, bisonParser_1.getWordRangeAtPosition)(document, position);
    if (!wordRange) {
        return 'unknown';
    }
    const word = document.getText(wordRange);
    if (analysis.tokenNames.has(word)) {
        return 'token';
    }
    if (analysis.ruleNames.has(word)) {
        return 'rule';
    }
    if (/^[A-Z_][A-Z0-9_]*$/.test(word)) {
        return 'token';
    }
    if (/^[a-z_][A-Za-z0-9_]*$/.test(word)) {
        return 'rule';
    }
    return 'unknown';
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
function dedupeLocations(locations) {
    const seen = new Set();
    const result = [];
    for (const loc of locations) {
        const key = `${loc.uri.toString()}:${loc.range.start.line}:${loc.range.start.character}:${loc.range.end.line}:${loc.range.end.character}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push(loc);
    }
    return result;
}
function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
async function findRelatedFlexBisonFiles(currentUri) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(currentUri);
    if (!workspaceFolder) {
        return [];
    }
    const allFiles = await vscode.workspace.findFiles('**/*.{y,l}', '**/node_modules/**');
    const currentDir = normalizePath(path.dirname(currentUri.fsPath));
    return allFiles.filter(uri => {
        if (uri.toString() === currentUri.toString()) {
            return false;
        }
        const fileDir = normalizePath(path.dirname(uri.fsPath));
        return isSameOrChildPath(fileDir, currentDir) || isSameOrChildPath(currentDir, fileDir);
    });
}
function isSameOrChildPath(pathA, pathB) {
    return pathA === pathB || pathA.startsWith(pathB + '/');
}
function normalizePath(p) {
    return p.replace(/\\/g, '/').replace(/\/+$/, '');
}
//# sourceMappingURL=referenceProvider.js.map