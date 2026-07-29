# Your Story — Deterministic Summary Logic

Reviewed: 2026-07-28

Your Story is a chronological view of self-reported records. It is not a diagnosis, clinical interpretation, treatment evaluation, recommendation, or recovery score. Version 1 uses deterministic TypeScript calculations and fixed templates. It does **not** call an external LLM.

## Source records

Only rows available to the authenticated account through Supabase RLS are eligible:

- Check-ins: entry date, sleep score, and selected symptom labels.
- Medications: medication name and the date the medication record was created. This is described only as “began logging,” not necessarily the date treatment started.
- Milestones: date, user-selected type, title, and optional notes.
- Journal selections: a user-selected excerpt of at most 500 characters and its source entry date.
- Saved timeline summaries: deterministic source text, optional user-edited text, visibility, export selection, and a source snapshot.
- Preferences: enabled state, grouping, custom dates, included categories, selected symptoms, and safety-event preference.

Appointments, dosage history, cycle phase, postpartum week, symptom-specific severity, medication stop dates, and structured “what helped” tags do not yet exist as first-class source records. They are included only when a user creates a neutral milestone. The UI must not imply these unavailable metrics were calculated.

## Period grouping

### Month

The default. A period begins on the first UTC calendar day and ends on the final UTC calendar day of the month. The label is the localized month and year.

### Week

A week begins Monday and ends Sunday in UTC. The label is `Week of YYYY-MM-DD`.

### Custom

The user provides inclusive `YYYY-MM-DD` start and end dates. The range is rejected when either date is invalid or the start follows the end. All eligible source records inside the inclusive range form one card.

Periods are displayed newest first. No card is synthesized for a period with no source record; the compassionate empty state is shown when there are no periods.

## Metrics

| Metric | Calculation | Display rule |
| --- | --- | --- |
| Check-in frequency | Count of check-ins with `entry_date` in the inclusive period | Always included in the summary |
| Symptom frequency | Number of check-ins containing each selected symptom | Top three, ordered by count then label; details show day counts |
| Sleep pattern | Arithmetic mean of non-null 1–5 sleep values, rounded to one decimal | Included only when at least one sleep value exists |
| Medication events | Count and list of medication records created in the period | Only when medication inclusion is enabled; says “began logging” |
| Milestones | Count and list of non-deleted user-created milestones in the period | Neutral title and date; never scored positive or negative |
| Appointments | Count of milestones whose user-selected type is `appointment` | Described as recorded appointments, without clinical interpretation |
| Journal selections | Explicitly selected, non-crisis excerpt and original entry date | Only when journal inclusion is enabled |
| Comparison | Current value minus immediately previous chronological period | Included only when values differ and a previous period exists |

Version 1 does not calculate average symptom severity because check-ins store symptom presence, not per-symptom severity. “Severe symptom days” must not appear until a structured severity field exists.

## Comparison rules

- Check-in counts use: `You completed N more/fewer check-ins than in the previous period.` Equal counts are described as zero more, without interpretation.
- Symptom counts use: `You recorded [symptom] on N days compared with M days in the previous period.`
- Sleep uses: `Average recorded sleep quality was X compared with Y in the previous period.`
- Comparisons never use “improved,” “worsened,” “better,” “recovered,” “effective,” or causal language.
- The comparison period is the adjacent older period in the selected grouping, not an inferred clinical baseline.

## Summary templates

Templates are appended only when their required metric exists:

```text
You completed [N] check-in(s) during this period.
[Symptom list] was/were recorded most often.
Your average recorded sleep quality was [X] out of 5.
You began logging [N] medication(s) during this period.
You added [N] milestone(s).
You recorded [N] healthcare appointment(s).
```

Expanded details use:

```text
[Symptom]: recorded on [N] day(s).
Began logging [Medication] on [date].
[date]: [user milestone title].
[date]: User-selected note — [explicitly selected excerpt]
```

The saved `generated_summary` preserves the deterministic output. If the user edits it, `edited_summary` is displayed and exported instead. Regeneration replaces the editor with a fresh deterministic result from current records; it does not call AI.

## User controls

- Choose month, week, or custom grouping.
- Include or exclude medication events.
- Include only explicitly selected journal notes or exclude journal notes entirely.
- Filter symptom labels through stored preferences (the first UI exposes the underlying preference model; expanded symptom-selection UI remains a known limitation).
- Add and delete neutral milestones.
- Expand a card to see source-derived details.
- Edit, save, regenerate, hide, or delete a timeline summary.
- Select individual visible cards and export only those cards through the system share sheet.
- Disable or re-enable Your Story without deleting underlying health records.

No export or sharing occurs in the background.

## Journal and safety rules

- Unstructured journal text is never analyzed for themes.
- A journal entry is excluded by default.
- The user must explicitly select an entry; the first 500 characters are offered as the selected excerpt in the current UI.
- Excerpts matching self-harm, suicide, inability to remain safe, harm to others, hallucination, or severe disorientation patterns are rejected and never added to an automatic narrative.
- `include_safety_events` defaults to false. Version 1 does not store a structured safety-resource access event, so it never generates the optional “You accessed Support and Safety resources during this period” statement. Adding that statement requires a future explicit event model and opt-in UI.
- Crisis-related free text is never quoted automatically.

## Hidden and deleted data

- Hidden cards remain stored with `hidden = true` and are not rendered.
- Summary and milestone deletion uses `deleted_at`; deleted rows are excluded from normal reads.
- Account deletion cascades to preferences, milestones, journal selections, summaries, and export selections.
- Hiding or deleting a generated summary never deletes its underlying check-ins, medications, journal entries, or milestones.

## Privacy and ownership

Every timeline table enables RLS, revokes anonymous/public access, and has authenticated operation-specific policies based on `auth.uid()`. Journal and export selection policies also verify ownership of the referenced source row. Client queries and mutations add an explicit `user_id` filter as defense in depth.

Timeline generation runs locally from already retrieved owner-scoped records. It writes no health content to logs and sends no timeline, journal, or health data to an external AI service. Export happens only after a user selects cards and invokes the system share sheet.

## Medical-language exclusions

Templates must never say or imply:

- a medication or treatment is working;
- PMDD, postpartum depression, or symptoms are improving or worsening clinically;
- the user is recovering;
- a treatment reduced or caused symptoms;
- cycle timing caused symptoms;
- a user should start, continue, change, or stop treatment;
- a user is clinically better or worse;
- a pattern confirms a diagnosis.

## Known limitations

- Dates use UTC calendar boundaries; a future version should adopt an explicit user timezone while preserving stored source dates.
- Medication creation is not proof of treatment start, so templates say “began logging.”
- Appointment counts, cycle phases, postpartum weeks, dosage changes, structured helpful tags, and symptom severity require future source fields.
- The UI currently offers recent whole journal entries for selection rather than sentence-level selection.
- Saved source snapshots support transparency but the UI does not yet deep-link each detail to its original source screen.
- Export is plain text through the native share sheet, not a clinician-reviewed PDF.
- Deterministic templates can be extended in the future. External AI is neither required nor approved for Your Story; any future proposal requires explicit product, privacy, security, clinical, and user approval.
