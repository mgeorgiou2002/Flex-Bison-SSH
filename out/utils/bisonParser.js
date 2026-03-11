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
exports.extractBisonTokens = extractBisonTokens;
exports.extractBisonNonTerminals = extractBisonNonTerminals;
exports.getWordRangeAtPosition = getWordRangeAtPosition;
exports.findBisonTokenDefinition = findBisonTokenDefinition;
exports.findBisonRuleDefinition = findBisonRuleDefinition;
const vscode = __importStar(require("vscode"));
function extractBisonTokens(text) {
    const tokens = new Set();
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
function extractBisonNonTerminals(text) {
    const nonTerminals = new Set();
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);
        if (match) {
            nonTerminals.add(match[1]);
        }
    }
    return [...nonTerminals];
}
function getWordRangeAtPosition(document, position) {
    return document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
}
function findBisonTokenDefinition(document, symbol) {
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
function findBisonRuleDefinition(document, symbol) {
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
//# sourceMappingURL=bisonParser.js.map