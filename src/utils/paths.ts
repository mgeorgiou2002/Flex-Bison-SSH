export function winPathToWsl(p: string) {
    return p
        .replace(/^([A-Za-z]):\\/, (_m, d) => `/mnt/${d.toLowerCase()}/`)
        .replace(/\\/g, '/');
}