export function flattenTokens(
  obj: Record<string, unknown>,
  prefix = '',
  separator = '-'
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}${separator}${key}` : key;

    if (typeof value === 'string') {
      result[newKey] = value;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenTokens(value as Record<string, unknown>, newKey, separator));
    }
  }

  return result;
}
// cleaned
