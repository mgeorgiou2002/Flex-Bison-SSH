import * as fs from 'fs';

export function findFlexBisonFiles(dir: string) {
    const entries = fs.readdirSync(dir);

    const lFiles = entries.filter(f => f.endsWith('.l'));
    const yFiles = entries.filter(f => f.endsWith('.y'));

    return { lFiles, yFiles };
}