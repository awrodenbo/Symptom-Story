# MVP Implementation Status

Reviewed: 2026-07-28

## Functional workflows

- Email/password registration, confirmation messaging, sign-in, persisted sessions, and sign-out use Supabase Auth.
- First-time users complete onboarding and choose PMDD or postpartum depression tracking; their profile is stored in Supabase.
- Users can create, view, update, and delete today’s check-in. Mood, sleep, energy, symptoms, medication status, and reflection persist in Supabase.
- Trends are computed only from the authenticated user’s stored check-ins and include an accessible text summary.
- Users can add and remove medications and log when a medication is taken.
- Users can create, view, and delete journal reflections.
- Users can export their own loaded records through the native share sheet.
- Account deletion calls a security-definer database function that deletes the authenticated `auth.users` row; cascading foreign keys remove related records.
- Support and Safety is available from every primary screen and automatically opens when urgent language is entered in the reflection field.

## Data and security

- All application records come from Supabase; no example health records or fictional profile data remain.
- Every table enables row-level security with `auth.uid()` ownership policies for reads and writes.
- The app uses the public anonymous key only. Session tokens are stored by React Native Async Storage.
- No analytics, advertising, LLM, or health-data logging integration is present.

## Experience states

- Authentication, initial app load, dashboard refresh, and form submissions show loading or disabled states.
- Data screens include empty states. Mutations show success feedback on Home, and errors are presented in an accessible notice.
- Destructive check-in and account deletion actions require confirmation.
- Screens use scroll containers and keyboard tap handling; touch controls are at least 44 points high.

## Remaining release validation

- Apply the migration to a non-production Supabase project and run authentication/RLS integration tests against it.
- Validate email templates, deep links, password recovery, rate limits, and account deletion behavior in the selected Supabase region.
- Run automated mobile UI tests and manual screen-reader, dynamic-type, keyboard, dark-mode, reduced-motion, and phone-size testing.
- Configure a reviewed regional crisis-resource dataset. The app intentionally labels this resource directory unavailable until it is configured.
- Complete legal, clinical, privacy, security, and accessibility review before processing real health information. Do not claim HIPAA compliance based on this implementation.
