# Privacy and Safety Review

Reviewed: 2026-07-28. This is an engineering review of the current prototype, not a compliance certification. **Do not use this build with real health information.**

## Current safeguards

- No analytics, advertising SDK, or committed secret is present. AI appointment summaries are optional and require an explicit disclosure acknowledgement before generation.
- Supabase authentication and database storage are used. Every health-data table has row-level security policies bound to `auth.uid()`, and foreign keys cascade record deletion.
- Native authentication tokens are stored in OS-protected SecureStore rather than general application storage. Web session storage requires separate browser hardening.
- The interface explicitly says that the product does not diagnose, screen, treat, or provide medical advice.
- Support and Safety is available from every primary tab. Its response is static and escapable. It directs a person toward immediate human help without inventing or hard-coding a crisis number.
- The repository contains fictional display data only. Application code does not log journal, medication, symptom, or check-in content.
- An automated source scan checks selected exclusionary phrases.
- The AI Edge Function queries only the authenticated account's check-ins and medication list, includes only user-entered questions, excludes journals and profile identity, requests provider-side non-storage, and returns an editable draft. Crisis responses remain static and never use AI.
- Your Story summaries are generated deterministically on-device from already retrieved owner-scoped records. They do not call the AI Edge Function. Journal text is excluded unless the user selects it, and safety-related excerpts are rejected.

## Known limitations and risks

- Security depends on deploying the included migration without modification and keeping RLS enabled. The migration has not been exercised against a live Supabase project in this environment.
- The export uses the native share sheet and includes records already retrieved under the authenticated session. A formal PDF report is not implemented.
- The resource directory is intentionally labeled unconfigured. Regional resources require a reviewed, configurable dataset and maintenance process before release.
- No encryption-at-rest, key management, consent record, retention schedule, audit trail, breach process, backup deletion policy, or verified deletion workflow exists.
- The UI has not completed assistive-technology, dynamic-type, keyboard, dark-mode, reduced-motion, localization, or device testing because dependencies cannot be downloaded in this environment.
- Local state is not suitable for sensitive health data. Browser storage must not be adopted as a shortcut without a threat model and explicit product approval.
- AI provider retention, regional processing, subprocessors, model behavior, and contractual controls require vendor review. The current acknowledgement is not stored as an auditable consent record.

## Required before real health information

1. Select an identity and data platform, document the threat model and data flows, and implement server-enforced per-user authorization and RLS with adversarial tests.
2. Implement authenticated, user-scoped persistence, export, retention, and deletion; verify deletion in primary storage, backups, and derived data.
3. Complete privacy/legal review, informed consent and policy copy, incident response, vendor review, and security testing. Do not claim HIPAA compliance without a formal determination.
4. Establish a clinically and legally reviewed safety-resource governance process, including region matching, freshness checks, offline behavior, and accessibility.
5. Complete manual accessibility and safety usability testing with representative users and licensed clinical/privacy reviewers.

## Environment variables

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are required and documented in `.env.example`. These are public client configuration. Service-role keys and other secrets must never be bundled into the app or committed.

The deployed Edge Function additionally requires server-only `OPENAI_API_KEY` and `OPENAI_MODEL` secrets. `APP_ORIGIN` should be set for a web deployment. None of these values may use the `EXPO_PUBLIC_` prefix or be committed.
