# Privacy and Safety Review

Reviewed: 2026-07-28. This is an engineering review of the current prototype, not a compliance certification. **Do not use this build with real health information.**

## Current safeguards

- No analytics, advertising SDK, generative-AI integration, remote API, database, or committed secret is present.
- Domain helpers require an active owner ID for writes and filter exports and reads by owner. Automated tests cover cross-account read, write, deletion, and export boundaries.
- The interface explicitly says that the product does not diagnose, screen, treat, or provide medical advice.
- Support and Safety is available from every primary tab. Its response is static and escapable. It directs a person toward immediate human help without inventing or hard-coding a crisis number.
- The repository contains fictional display data only. Application code does not log journal, medication, symptom, or check-in content.
- An automated source scan checks selected exclusionary phrases.

## Known limitations and risks

- This prototype has no authentication, server, database, or row-level security (RLS). The owner checks are tested domain logic, not a security boundary. RLS therefore cannot be configured or verified yet.
- Entries shown in the UI are sample content and check-in state is held in memory. It does not persist after restart; sign-in, sign-out, account deletion, and a real user-scoped export UI are not implemented.
- The resource directory is intentionally labeled unconfigured. Regional resources require a reviewed, configurable dataset and maintenance process before release.
- No encryption-at-rest, key management, consent record, retention schedule, audit trail, breach process, backup deletion policy, or verified deletion workflow exists.
- The UI has not completed assistive-technology, dynamic-type, keyboard, dark-mode, reduced-motion, localization, or device testing because dependencies cannot be downloaded in this environment.
- Local state is not suitable for sensitive health data. Browser storage must not be adopted as a shortcut without a threat model and explicit product approval.

## Required before real health information

1. Select an identity and data platform, document the threat model and data flows, and implement server-enforced per-user authorization and RLS with adversarial tests.
2. Implement authenticated, user-scoped persistence, export, retention, and deletion; verify deletion in primary storage, backups, and derived data.
3. Complete privacy/legal review, informed consent and policy copy, incident response, vendor review, and security testing. Do not claim HIPAA compliance without a formal determination.
4. Establish a clinically and legally reviewed safety-resource governance process, including region matching, freshness checks, offline behavior, and accessibility.
5. Complete manual accessibility and safety usability testing with representative users and licensed clinical/privacy reviewers.

## Environment variables

None are currently consumed. When a backend is approved, only public client configuration may appear in an example environment file. Service keys and other secrets must never be bundled into the app or committed.
