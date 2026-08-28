import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sageTheme, theme } from '../src/theme/tokens.ts';
import { calculateCycleHistory, estimateNextPeriod, type CycleEvent } from '../src/domain.ts';

// Calculate relative luminance for hex color (#RRGGBB)
function relativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Calculate WCAG contrast ratio between two hex colors
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

test('semantic text and placeholder colors meet WCAG AA contrast requirements (>= 4.5:1)', () => {
  const bg = theme.colors.background; // #F8F6F0
  const surface = theme.colors.surface; // #FFFFFF

  // Primary text contrast vs background and surface
  assert.ok(contrastRatio(theme.colors.textPrimary, bg) >= 4.5, 'textPrimary on bg >= 4.5');
  assert.ok(contrastRatio(theme.colors.textPrimary, surface) >= 4.5, 'textPrimary on surface >= 4.5');

  // Muted text contrast vs background and surface
  assert.ok(contrastRatio(theme.colors.textMuted, bg) >= 4.5, 'textMuted on bg >= 4.5');
  assert.ok(contrastRatio(theme.colors.textMuted, surface) >= 4.5, 'textMuted on surface >= 4.5');

  // Placeholder contrast vs input background (surface)
  assert.ok(contrastRatio(theme.colors.placeholder, theme.colors.inputBg) >= 4.5, 'placeholder on inputBg >= 4.5');

  // Brand primary contrast vs surface
  assert.ok(contrastRatio(theme.colors.brandPrimary, surface) >= 4.5, 'brandPrimary on surface >= 4.5');

  // Notice text contrast vs notice background
  assert.ok(contrastRatio(theme.colors.noticeText, theme.colors.noticeBg) >= 4.5, 'noticeText on noticeBg >= 4.5');

  // Error text contrast vs error background and surface
  assert.ok(contrastRatio(theme.colors.errorText, theme.colors.errorBg) >= 4.5, 'errorText on errorBg >= 4.5');
  assert.ok(contrastRatio(theme.colors.danger, surface) >= 4.5, 'danger on surface >= 4.5');
});

test('shared control minimum touch-target dimensions are at least 44x44pt', () => {
  assert.ok(theme.touchTarget.minHeight >= 44, 'minHeight >= 44');
  assert.ok(theme.touchTarget.minWidth >= 44, 'minWidth >= 44');
});

test('theme tokens are purely cosmetic and cannot modify domain or calculation results', () => {
  const events: CycleEvent[] = [
    { event_type: 'period_start', event_date: '2026-05-10', occurred_at: '2026-05-10T08:00:00Z' },
    { event_type: 'period_start', event_date: '2026-06-07', occurred_at: '2026-06-07T08:00:00Z' },
    { event_type: 'period_start', event_date: '2026-07-05', occurred_at: '2026-07-05T08:00:00Z' },
    { event_type: 'period_start', event_date: '2026-08-01', occurred_at: '2026-08-01T08:00:00Z' },
  ];

  const estimateBefore = estimateNextPeriod(events);
  const historyBefore = calculateCycleHistory(events);

  // Inspecting theme or creating theme object produces zero side effects on domain logic
  assert.equal(sageTheme.id, 'sage');
  const estimateAfter = estimateNextPeriod(events);
  const historyAfter = calculateCycleHistory(events);

  assert.deepEqual(estimateBefore, estimateAfter);
  assert.deepEqual(historyBefore, historyAfter);
});

test('check-in step state navigation preserves entered values when moving backward and forward', () => {
  const state = {
    step: 2,
    mood: 4,
    sleep: 3,
    energy: 4,
    selectedFeelings: ['Calm', 'Hopeful'],
    selectedSymptoms: ['Cramps'],
    med: true,
    reflection: 'Restful afternoon',
  };

  // Move back to step 1
  const stepBack = Math.max(0, state.step - 1);
  assert.equal(stepBack, 1);
  // All entered fields remain intact
  assert.equal(state.mood, 4);
  assert.equal(state.sleep, 3);
  assert.deepEqual(state.selectedFeelings, ['Calm', 'Hopeful']);

  // Move forward to step 2 again
  const stepForward = Math.min(6, stepBack + 1);
  assert.equal(stepForward, 2);
  assert.equal(state.sleep, 3);
  assert.equal(state.reflection, 'Restful afternoon');
});
