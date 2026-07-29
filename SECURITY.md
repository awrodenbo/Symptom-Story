# Security Policy

## Status and scope

Symptom Story is a pre-release health-data application. The controls below reduce known risk, but they are not a certification and do not establish HIPAA compliance. Do not use production health information until the deployment has completed independent security, privacy, and legal review.

This review covers the Expo client, Supabase API usage, authentication storage, SQL migrations, row-level security (RLS), input constraints, configuration, and repository secrets.

## Reporting a vulnerability

Do not open a public issue containing credentials, tokens, health information, or exploit details. Report vulnerabilities privately to the repository owner using GitHub's private vulnerability reporting feature. Include affected versions, reproduction steps using fictional data, impact, and suggested mitigation. Revoke any exposed credential before sending a report.

## Implemented safeguards

### Authentication and sessions

- Supabase Auth owns registration, password verification, email confirmation, session refresh, and server-issued user identity. The client never stores or compares passwords.
- Native bearer-token sessions use Expo SecureStore with the `WHEN_UNLOCKED_THIS_DEVICE_ONLY` accessibility class. Web sessions use AsyncStorage because SecureStore is unavailable on web; deployments must add an appropriate Content Security Policy and assess browser-storage risk.
- The app uses `auth.uid()` from the verified Supabase JWT as the database identity. A user ID supplied by the UI is never the database authorization boundary.
- Sign-out clears the local Supabase session. Account deletion is limited to an authenticated user deleting their own `auth.users` row.

Supabase project owners must enable email confirmation, use a strong password policy, configure redirect/deep-link allowlists exactly, enable leaked-password protection where available, set appropriate OTP/session expiry, and rate-limit authentication endpoints.

### Database authorization

- RLS is enabled on every user-data table.
- Policies are operation-specific, restricted to the `authenticated` role, and compare ownership against `(select auth.uid())` in both `USING` and `WITH CHECK` clauses as appropriate.
- Anonymous and `public` table privileges are revoked. The authenticated role receives only CRUD table privileges; RLS still applies to every request.
- Medication-log insertion verifies that the referenced medication belongs to the same authenticated user, preventing cross-owner foreign-key associations.
- The client also filters reads and destructive writes by the active user ID as defense in depth. This is not a substitute for RLS.
- Foreign keys cascade deletion from `auth.users`, and the account-deletion function is revoked from `public` and `anon`.

### Input and output handling

- Database constraints enforce field lengths, numeric ranges, trimmed required text, allowed tracking modes, one check-in per user/date, and a fixed symptom allowlist.
- Client input limits improve feedback, while database constraints remain the trust boundary.
- React Native renders text without interpreting it as HTML. Journal entries are never sent to the AI summary function. Only after explicit consent, the function sends owner-scoped check-ins, medications, and user questions to the configured AI provider. Health content is not sent to analytics or advertising services.
- The AI provider key and model name are server-only Edge Function secrets. Requests use `store: false`; the client never receives the provider key. Model output is structured, checked for prohibited clinical claims, and returned as an editable draft.
- Your Story is separate from the optional AI appointment draft. Its timeline templates run locally, use authenticated/RLS-scoped records, exclude journals by default, reject safety-related excerpts, and export only after explicit card selection.
- Exports are assembled only from records already retrieved through the authenticated, RLS-protected session. Users should be warned that the destination selected in the system share sheet is outside the app's control.
- Health-record content is not written to application logs.

### Configuration and secrets

- Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` belong in the client. The anonymous key is public configuration and depends on RLS; it is not an authorization secret.
- `.env*` files are ignored except `.env.example`. No real credential belongs in source control.
- Never use a Supabase service-role key, database password, JWT signing secret, private API key, or production token in an Expo environment variable. `EXPO_PUBLIC_*` values are compiled into the application and visible to users.
- Rotate a credential immediately if it is committed, logged, included in a build artifact, or shared through an insecure channel. Removing it from Git history is not sufficient.

## Deployment checklist

1. Apply all migrations in order and verify RLS remains enabled using Supabase's database linter.
2. Test cross-account select, insert, update, delete, export, medication-reference, and account-deletion attempts against a non-production project.
3. Confirm the app contains the anonymous key only and scan the repository and compiled bundles for secrets.
4. Configure Auth redirect URLs, email templates, bot/rate-limit controls, password policy, session lifetime, and MFA requirements.
5. Restrict Supabase network/database administration access and require MFA for project administrators.
6. Establish encrypted backups, retention/deletion rules, audit-log access controls, incident response, dependency scanning, and a patching SLA.
7. Complete mobile penetration testing, web CSP review, dependency review, and privacy threat modeling before release.

## Known limitations

- Automated tests statically inspect migrations; they do not prove policies are deployed correctly. Live adversarial RLS integration tests are still required.
- SecureStore protects native tokens at rest but cannot protect a compromised/unlocked device, malicious operating system, or captured active session.
- Browser session storage has a larger attack surface than native SecureStore. The web build needs CSP, XSS review, and deployment-specific hardening.
- The current account-deletion function performs immediate cascading deletion in the primary database. Backup expiry and deletion must be governed operationally.
- Dependency vulnerability scanning and runtime testing could not be completed in the current environment because its npm registry proxy rejected dependency downloads.

## Supported versions

Until the first production release, only the current default branch is supported with security fixes.
