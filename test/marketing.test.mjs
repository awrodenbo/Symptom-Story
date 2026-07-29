import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const pages = ['index','features','privacy','accessibility','faq','about','contact','download'];

test('marketing site includes every required page with core landmarks', () => {
  for (const page of pages) {
    const file = `marketing/${page}.html`;
    assert.equal(existsSync(file), true, file);
    const html = readFileSync(file, 'utf8');
    assert.match(html, /<title>[^<]+<\/title>/i, file);
    assert.match(html, /<main id="main">/i, file);
    assert.match(html, /<nav[^>]+aria-label="Primary"/i, file);
    assert.match(html, /<footer/i, file);
    assert.match(html, /href="#main"/i, file);
  }
});

test('all local marketing links resolve', () => {
  for (const page of pages) {
    const html = readFileSync(`marketing/${page}.html`, 'utf8');
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (/^(#|mailto:|https?:)/.test(href)) continue;
      const target = href.split('#')[0];
      assert.equal(existsSync(target.startsWith('../') ? target.slice(3) : `marketing/${target}`), true, `${page}.html -> ${href}`);
    }
  }
});

test('marketing CSS supports responsive and reduced-motion layouts', () => {
  const css = readFileSync('marketing/styles.css', 'utf8');
  assert.match(css, /@media\(max-width:850px\)/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /:focus-visible/);
});
