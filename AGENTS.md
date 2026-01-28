## Project Summary
A betting predictions engine that analyzes football matches using Poisson and Elo models. It fetches all data, including odds, exclusively from SportMonks API (v3), calculates probabilities, and saves high-confidence (≥65%) predictions as "PUBLISH".

## Tech Stack
- Node.js / Next.js
- Supabase (PostgreSQL)
- SportMonks API (v3)

## Architecture
- Core engine logic in `src/lib/engine.ts`.
- Mathematical models in `src/lib/models/`.
- API clients in `src/lib/clients/`.
- Database schema managed via Supabase.

## User Preferences
- No UI, no LLM, no bankroll/billing.
- Strict 70% threshold.
- Engine runs 4 times daily at 00:00, 06:00, 12:00, 18:00 UTC.
- Dashboard shows games starting in the next 72 hours (0-72h window).
- Engine prioritizes fixtures that have not yet started and processes up to 100 fixtures per cycle.

## Project Guidelines
- Idempotent execution.
- Hardcoded rules as per instructions.
- Minimal dependencies.
- No comments unless requested.

## Common Patterns
- Poisson distribution for BTTS and Over/Under.
- Elo rating system for 1X2.
- Average odds from last 24h using SportMonks pre-match odds.
- SportMonks v3: Use `fixtures/between/{start}/{end}/{team_id}` for team history.
- SportMonks v3 Odds: Use `odds/pre-match/fixtures/{fixture_id}` with `include=market`.
- Direct ID matching for odds (no fuzzy matching needed as everything comes from SportMonks).
