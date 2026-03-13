type ThemeTokens = Record<string, string>;

export function toThemeCss(name: string, tokens: ThemeTokens): string {
  const lines = [`[data-theme="${name}"] {`];
  for (const [key, value] of Object.entries(tokens)) {
    lines.push(`  --tempo-${key}: ${value};`);
  }
  lines.push('}');
  return lines.join('\n');
}
