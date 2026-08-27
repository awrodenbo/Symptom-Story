# Symptom Story

**Your symptoms. Your patterns. Your story.**

A calming, mobile-first companion for people who want to better understand their symptoms, cycles, and bodies—including people navigating PMDD, PCOS, postpartum changes, or simply looking for clearer insight into their personal patterns.

Symptom Story brings together quick daily check-ins, cycle tracking, private reflection, treatment context, and understandable personal trends to help users see their own story over time.

## Your Data Is Yours

Symptom Story is designed around privacy. Your personal health information is stored in your authenticated account and is not sold to advertisers or voluntarily shared with government agencies. Your symptoms, cycle history, journal entries, and personal patterns belong to you.

**Private by design. No ads. No sale of health data.**

## What Symptom Story Does

- Quick daily check-ins for mood, feelings, energy, sleep, and physical/GI symptoms
- Flexible cycle and menstrual-flow tracking
- Personal cycle history and clearly labeled estimates
- **My Patterns** identifies recurring associations in your own logged history
- **My Pre-Period Plan** keeps your personally established support plan close when you may need it
- **Eat · Move · Restore** provides optional wellness ideas responsive to how you're actually feeling
- **Today's Support** brings your Check-In, recorded cycle context, established personal patterns, and relevant wellness support together in one place
- Private journaling and treatment context
- Privacy-conscious, authenticated personal data storage

## Built Around Your Story — Not a Textbook Cycle

Symptom Story preserves long, variable, and unusual cycle histories rather than treating them as invalid simply because they fall outside a typical range.

Estimates are labeled as estimates. Personal patterns require repeated observations. Your reported symptoms and experiences take priority over generic cycle assumptions.

Symptom Story is designed to help you understand your own history—not tell you what your body is supposed to be doing.

## Run locally

```bash
npm install
cp .env.example .env
# Fill in the public Supabase project URL and anonymous key.
npm run web
```

Or use `npm start` to open the Expo development menu for iOS or Android.

Apply `supabase/migrations/202607280001_initial.sql` to a new Supabase project before starting the app. Authentication sessions are stored with React Native Async Storage; application records are stored in Supabase and protected by row-level security. Never place a Supabase service-role key in the app environment.

For password recovery, add the app's generated root URL to the Supabase Auth redirect allowlist. Production native builds use the `symptomstory://` scheme configured in `app.json`; web deployments use their HTTPS origin. Configure custom SMTP and the desired password policy in Supabase before production release. Test native recovery links with a development or production build rather than Expo Go.

## Product safety

Symptom Story does not diagnose, screen for, or treat any condition. It is designed to help people record their own experiences and prepare for conversations with licensed healthcare professionals.
