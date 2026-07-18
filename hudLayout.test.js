import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

describe('Toy-Box HUD composition', () => {
  it('keeps resources in the lower-left and reserves the narrow layout for narrow widths', () => {
    expect(css).toMatch(/\.resource-cluster\s*\{[^}]*left:\s*20px;[^}]*bottom:\s*20px;/s);
    expect(css).toContain('@media (max-width: 520px)');
    expect(css).not.toContain('@media (max-height: 800px)');
  });

  it('defines a traveling foam crest with a static reduced-motion alternative', () => {
    expect(css).toMatch(/\.lap-wave\[data-travel="true"\]\s*\{[^}]*foam-wave-journey/s);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.lap-wave\[data-travel="true"\][\s\S]*?animation:\s*none/s);
  });
});
