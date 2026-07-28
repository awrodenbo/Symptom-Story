# MVP Audit Report

Reviewed: 2026-07-28

## Inventory

### Functional in the prototype

- Five-tab bottom navigation switches among Home, Check-In, Trends, Journal, and Profile.
- The six-step check-in can be advanced, skipped, moved backward, and completed in memory.
- Support and Safety opens from every primary tab and can be dismissed.
- Responsive content is capped to a phone-like width on large screens.
- Pure domain functions create/update/delete owner-scoped records, remove account data, produce a user-scoped JSON export, and detect urgent safety language. These functions are covered by automated tests but are not yet connected to screen state.

### Visually present but not functional

- Home quick actions, reminder Save/Share, notification button, appointment card, Profile settings, export row, and appearance/accessibility rows.
- Journal “New reflection” and the displayed journal cards.
- Medication and symptom option chips do not retain a selection.

### Mocked with fictional sample data

- User name, cycle day, medication time, clinician appointment, check-in time, seven-day chart, trend summary, and journal entries.
- Trends do not yet reflect a completed check-in.

### Partially implemented

- Check-in inputs: mood is retained only while the component is mounted; reflection text and other answers are not saved.
- Safety: the static response is implemented, but automatic activation is domain-tested only and the verified regional resource directory is unconfigured.
- Ownership, deletion, and export: domain rules and tests exist, but no authenticated persistence layer or UI connection exists.
- Accessibility: large primary controls, tab selection state, safety labels/live region, safe area, non-color chart summary, and readable contrast are present. Comprehensive screen-reader, text-scaling, keyboard, focus, reduced-motion, and dark-mode verification remains.

### Not implemented

- Onboarding, authentication, session restoration, sign-out/sign-in, password recovery, persistent storage, backend authorization/RLS, account deletion UI, or PDF export/preview.
- Editing/deleting check-ins in the UI, medication/treatment management, notification scheduling, PMDD/postpartum setup, offline synchronization, loading/error/empty states, haptics, and system dark-mode styling.

### External services and configuration

- No runtime service or environment variable is currently required.
- Before real use, the project requires approved identity/database infrastructure and a maintained regional safety-resource configuration. These have deliberately not been selected during this audit.

## Mobile and content review

- The persistent bottom navigation, short card flow, 48–54 px primary targets, safe-area wrapper, low typing burden, and scrollable screens support one-handed use.
- The Support button sits above navigation on all main tabs. The safety screen is calm, static, does not use AI, does not trap navigation, and avoids unverified phone numbers.
- The chart includes a plain-language summary and a statement that the observation is not medical advice.
- Project copy avoids the audited exclusionary phrases and does not claim diagnosis, recovery prediction, causation, or treatment effectiveness.
- Device layouts at 375×667, 390×844, and 430×932 could not be visually executed because the network policy prevented Expo dependencies from being installed. Code inspection indicates scroll containers and the responsive width cap avoid fixed viewport-height overflow, but this is not a substitute for device testing.

## Decisions requiring approval

1. Identity/database vendor and security architecture.
2. Whether export should be JSON plus a shareable PDF, and which fields it should contain.
3. Regional launch scope and the accountable owner/review schedule for safety resources.
4. Retention and deletion windows, including backup deletion.
5. Whether the next phase prioritizes real authentication/persistence or completes onboarding and accessibility design first.

## Five highest-priority next tasks

1. Approve a threat model and authenticated data architecture, then enforce ownership at the database layer.
2. Connect check-in, journal, medication, export, and deletion screens to encrypted user-scoped persistence.
3. Implement onboarding/session flows and verify restart, sign-out, sign-in, and deletion behavior end to end.
4. Configure reviewed regional crisis resources and usability-test the full safety path.
5. Complete device, screen-reader, dynamic-text, keyboard, reduced-motion, dark-mode, integration, and production-build testing.
