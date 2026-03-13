type TokenValue = string | number | readonly string[] | Record<string, unknown>;
type Tokens = Record<string, TokenValue | Record<string, TokenValue>>;

export function toCssVariables(tokens: Tokens, prefix = 'tempo'): string {
  const lines: string[] = [':root {'];

  for (const [category, values] of Object.entries(tokens)) {
    if (typeof values === 'object' && !Array.isArray(values)) {
      for (const [key, value] of Object.entries(values as Record<string, TokenValue>)) {
        if (typeof value === 'string') {
          lines.push(`  --${prefix}-${category}-${key}: ${value};`);
        }
      }
    } else if (typeof values === 'string') {
      lines.push(`  --${prefix}-${category}: ${values};`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}
