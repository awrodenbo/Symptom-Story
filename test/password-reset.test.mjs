import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { normalizeResetEmail, passwordResetErrorMessage } from '../src/passwordReset.ts';

const app = readFileSync('app/index.tsx', 'utf8');

test('normalizes and validates password reset email addresses', () => {
  assert.equal(normalizeResetEmail(' Person@Example.COM '), 'person@example.com');
  assert.throws(() => normalizeResetEmail('not-an-email'), /valid email/);
});

test('maps password reset failures to friendly messages', () => {
  assert.equal(passwordResetErrorMessage({ status: 429, message: 'raw provider detail' }), 'Please wait a moment before requesting another reset email.');
  assert.doesNotMatch(passwordResetErrorMessage(new Error('raw provider detail')), /raw provider detail/);
});

test('forgot password UI calls Supabase with the configured redirect', () => {
  assert.match(app, /resetPasswordForEmail\(normalizedEmail,\{redirectTo:PASSWORD_RESET_REDIRECT_URL\}\)/);
  for (const text of ['Forgot Password?', 'Forgot Password', 'Send Reset Link', 'Back to Sign In', 'Check Your Email', 'Resend Email']) assert.match(app, new RegExp(text.replace('?', '\\?')));
  assert.match(app, /If an account exists for this email address/);
  assert.match(app, /disabled=\{busy/);
});
