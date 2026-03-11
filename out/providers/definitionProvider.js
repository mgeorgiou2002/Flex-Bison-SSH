"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlexBisonDefinitionProvider = void 0;
const bisonParser_1 = require("../utils/bisonParser");
class FlexBisonDefinitionProvider {
    provideDefinition(document, position, _token) {
        const range = (0, bisonParser_1.getWordRangeAtPosition)(document, position);
        if (!range)
            return;
        const symbol = document.getText(range);
        const isBison = document.languageId === 'bison' || document.fileName.endsWith('.y');
        if (!isBison)
            return;
        const tokenDef = (0, bisonParser_1.findBisonTokenDefinition)(document, symbol);
        if (tokenDef)
            return tokenDef;
        const ruleDef = (0, bisonParser_1.findBisonRuleDefinition)(document, symbol);
        if (ruleDef)
            return ruleDef;
        return;
    }
}
exports.FlexBisonDefinitionProvider = FlexBisonDefinitionProvider;
//# sourceMappingURL=definitionProvider.js.map