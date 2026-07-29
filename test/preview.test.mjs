import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const app = readFileSync('app/index.tsx', 'utf8');
const preview = readFileSync('app/PreviewApp.tsx', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const expo = JSON.parse(readFileSync('app.json', 'utf8'));

test('Expo preview mode is an explicit build-time entry', () => {
  assert.match(app, /EXPO_PUBLIC_PREVIEW_MODE==='true'\?<PreviewApp\/>:<AuthenticatedApp\/>/);
  assert.doesNotMatch(preview, /supabase|OPENAI|EXPO_PUBLIC_SUPABASE/);
  assert.match(preview, /fictional data only · nothing is saved/);
});

test('preview covers onboarding, dashboard, and check-in states', () => {
  for (const content of ['Make this space yours','Continue to preview','Hello','Start daily check-in','DAILY CHECK-IN','Check-in complete']) {
    assert.match(preview, new RegExp(content, 'i'), content);
  }
  assert.match(preview, /screen==='onboarding'/);
  assert.match(preview, /screen==='home'/);
  assert.match(preview, /screen==='complete'/);
});

test('package scripts preserve mobile and web while adding preview commands', () => {
  for (const script of ['start','ios','android','web','preview','preview:web','preview:mobile','build:preview','preview:serve','vercel-build']) {
    assert.equal(typeof packageJson.scripts[script], 'string', script);
  }
  assert.match(packageJson.scripts['build:preview'], /EXPO_PUBLIC_PREVIEW_MODE=true expo export --platform web/);
  assert.equal(expo.expo.web.bundler, 'metro');
  assert.equal(expo.expo.web.output, 'static');
});

test('Vercel deploys only the static fictional preview with security headers', () => {
  assert.equal(vercel.buildCommand, 'npm run build:preview');
  assert.equal(vercel.outputDirectory, 'dist');
  const headers = Object.fromEntries(vercel.headers[0].headers.map((item) => [item.key, item.value]));
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.match(headers['Permissions-Policy'], /camera=\(\)/);
  assert.match(headers['Content-Security-Policy'], /connect-src 'self'/);
});

test('README gives exact local and Vercel preview actions', () => {
  const readme = readFileSync('README.md', 'utf8');
  assert.match(readme, /http:\/\/localhost:8081/);
  assert.match(readme, /http:\/\/localhost:4174/);
  assert.match(readme, /Continue to preview/);
  assert.match(readme, /Add New → Project/);
  assert.match(readme, /Click \*\*Deploy\*\*/);
});
