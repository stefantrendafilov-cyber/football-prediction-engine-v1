## Project Summary
A betting predictions engine called **Winlytics.AI** that analyzes football matches using Poisson and Elo models. It fetches data from SportMonks API (v3), calculates probabilities, and provides stake recommendations based on a robust Fixed Stake (1.5%/0.75%) strategy.

## Tech Stack
- **Framework**: Next.js (App Router), React 19, Tailwind CSS
- **Database/Auth**: Supabase (PostgreSQL)
- **Data Source**: SportMonks API (v3)
- **Styling**: Tailwind CSS, Shadcn UI, Lucide Icons, Recharts (Analytics)
- **Runtime**: Node.js / Bun

## Architecture
- **Core Engine**: `src/lib/engine.ts` handles the analysis cycles.
- **Betting Logic**: `src/lib/betting/` contains the Fixed Stake system and `BettingService` for bankroll/bet management.
- **API Routes**: `/api/engine`, `/api/bets`, `/api/bankroll`, and cron jobs for sync/engine runs.
- **Dashboard**: Integrated monitoring, live predictions, bet management, and performance analytics.

## User Preferences
- **70% Threshold**: Predictions are only published if the model probability is ≥ 70%.
- **Fixed Stake v1**: Standard stake is 1.5% of bankroll. Reduced to 0.75% after 3 consecutive losses. Recovers after 2 wins in last 3 settled bets.
- **Aesthetics**: Dark mode (black/zinc), bold typography, no italics on buttons, high-contrast accents (blue/emerald).

## Project Guidelines
- **No Comments**: Keep code clean and idiomatic without unnecessary comments.
- **Idempotency**: Engine cycles and result syncing must be idempotent.
- **Security**: Never expose secrets; use Supabase Auth for route protection.

## Common Patterns
- **Fixed Stake Strategy**: Always use `calculateFixedStake` for recommendations.
- **Data Fetching**: Use RSC for data fetching on pages, and client components for interactivity (wrapped in Suspense).
- **Service Layer**: Business logic for betting resides in `BettingService`.
