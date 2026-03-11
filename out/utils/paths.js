"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.winPathToWsl = winPathToWsl;
function winPathToWsl(p) {
    return p
        .replace(/^([A-Za-z]):\\/, (_m, d) => `/mnt/${d.toLowerCase()}/`)
        .replace(/\\/g, '/');
}
//# sourceMappingURL=paths.js.map