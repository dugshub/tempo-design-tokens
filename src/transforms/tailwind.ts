type TokenMap = Record<string, string | Record<string, string>>;

export function toTailwindConfig(tokens: TokenMap): Record<string, unknown> {
  return {
    theme: {
      extend: tokens,
    },
  };
}
