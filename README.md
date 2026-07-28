# Symptom Story

A calming, mobile-first companion for people professionally diagnosed with PMDD or postpartum depression. The Expo prototype focuses on quick daily check-ins, private reflection, treatment context, and understandable personal trends.

## Run locally

```bash
npm install
cp .env.example .env
# Fill in the public Supabase project URL and anonymous key.
npm run web
```

Or use `npm start` to open the Expo development menu for iOS or Android.

Apply `supabase/migrations/202607280001_initial.sql` to a new Supabase project before starting the app. Authentication sessions are stored with React Native Async Storage; application records are stored in Supabase and protected by row-level security. Never place a Supabase service-role key in the app environment.

## Product safety

Symptom Story does not diagnose, screen for, or treat any condition. It is designed to help people record their own experiences and prepare for conversations with licensed healthcare professionals.
