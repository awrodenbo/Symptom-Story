import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const readme = readFileSync('README.md', 'utf8');

test('README contains the portfolio documentation sections', () => {
  for (const heading of [
    'Product preview', 'Features', 'Architecture', 'Technology stack',
    'Getting started', 'Quality checks', 'Accessibility statement',
    'Privacy philosophy', 'Roadmap', 'Contributing', 'License',
  ]) assert.match(readme, new RegExp(`^## ${heading}$`, 'm'), heading);
  assert.match(readme, /```mermaid/);
});

test('README local links and images resolve', () => {
  const targets = [
    ...[...readme.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1]),
    ...[...readme.matchAll(/<img[^>]+src="([^"]+)"/g)].map((match) => match[1]),
  ];
  for (const href of targets) {
    const target = href.split('#')[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    assert.equal(existsSync(target), true, target);
  }
});

test('portfolio screenshots are accessible, fictional SVG renders', () => {
  for (const name of ['home', 'checkin', 'trends']) {
    const svg = readFileSync(`docs/images/${name}.svg`, 'utf8');
    assert.match(svg, /role="img"/);
    assert.match(svg, /<title id="t">/);
    assert.match(svg, /<desc id="d">/);
    assert.doesNotMatch(svg, /(?:href|xlink:href)=["']https?:\/\//);
  }
  assert.match(readme, /fictional design renders/i);
});

test('contribution and community governance files are present', () => {
  for (const file of ['CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md', 'LICENSE']) {
    assert.equal(existsSync(file), true, file);
  }
});
