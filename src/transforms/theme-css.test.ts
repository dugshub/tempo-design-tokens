import { describe, it, expect } from 'bun:test';
import { toThemeCss } from './theme-css';

describe('toThemeCss', () => {
  it('generates CSS custom properties for a theme', () => {
    const result = toThemeCss('dark', { background: '#111827', foreground: '#f9fafb' });
    expect(result).toContain('[data-theme="dark"]');
    expect(result).toContain('--tempo-background: #111827');
    expect(result).toContain('--tempo-foreground: #f9fafb');
  });
});
