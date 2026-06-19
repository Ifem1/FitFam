# FitFam — AI-Powered Fitness Plans on GenLayer

FitFam is a full-stack web application that generates deeply personalized fitness and nutrition plans using **GenLayer**, a decentralized AI blockchain. Every plan is produced through multi-validator LLM consensus on-chain, ensuring the output is trustless, verifiable, and not controlled by any single server or API.

---

## What It Does

Users fill out a short profile — age, weight, height, fitness goals, dietary preferences, and experience level — choose a plan duration (1, 3, or 6 months), pay in **GEN tokens**, and receive a complete, structured fitness program. The plan includes:

- A week-by-week training schedule with named exercises, sets, reps, rest periods, and form cues
- Warm-up and cool-down protocols for every training day
- A full nutrition breakdown: daily calorie targets, macro ratios, meal templates (training days and rest days), food lists, and hydration guidance
- Diet-style meal plans (High-Protein Balanced, Lean Bulk, Cutting, Endurance Carb-Forward, or Mediterranean)
- Supplement recommendations tailored to the user's goal
- Region-aware food tips covering North America, Europe, West Africa, East Africa, South Asia, East Asia, Latin America, the Middle East, and the Caribbean
- Progressive intensity curves (Linear, Wave Loading, or Block Periodisation) with weekly themes across the full program duration
- Exercise form guides for major compound lifts (Bench Press, Back Squat, Deadlift, Overhead Press, Pull-Ups, Romanian Deadlift, Hip Thrust)
- Milestone checkpoints and motivational weekly check-in questions

Plans can be downloaded as a PDF directly from the dashboard.

---

## How GenLayer Powers Plan Generation

GenLayer is an EVM-compatible Layer 1 blockchain that runs **Intelligent Contracts** — Python smart contracts that can make non-deterministic calls to LLMs as part of their execution. Multiple independent validator nodes each run the LLM call and must reach consensus on the result before the transaction is finalized on-chain.

### The Two-Phase Design

FitFam's contract (`contracts/fitness_plan.py`) uses a deliberate two-phase approach to keep consensus reliable while still delivering rich, personalized output.

**Phase 1 — LLM Consensus (non-deterministic):**
Each validator independently calls an LLM with the user's profile and asks it to produce a small, tightly constrained JSON "recipe" — roughly 8 fields covering training split, calorie target, macro ratios, diet style, intensity curve, and recovery priority. Because the output is tiny and the schema is strict, validators can reach equality consensus reliably.

**Phase 2 — Deterministic Expansion:**
Once the recipe is agreed upon, the contract deterministically expands it into the full multi-week plan using Python lookup tables baked into the contract itself — `EXERCISE_LIBRARY`, `MEAL_LIBRARY`, `TRAINING_SPLITS`, `SUPPLEMENT_RECS`, `SAMPLE_MEAL_PLANS`, and more. Every validator builds the exact same final plan from the same recipe, so there is no non-determinism in the expansion step.

This design means the personalization intelligence sits in the LLM recipe, while the plan volume and structure are guaranteed deterministic. It eliminates the leader-rotation and undetermined-state risks that come with large LLM outputs.

### Contract Methods

| Method | Type | Description |
|--------|------|-------------|
| `submit_fitness_profile(...)` | Write | Validates inputs, runs LLM consensus on the recipe, deterministically expands the full plan, persists it on-chain, returns the plan ID |
| `mark_plan_paid(plan_id)` | Write | Marks a plan as unlocked; only callable by the plan owner or contract owner |
| `rate_plan(plan_id, stars, comment)` | Write | Lets the plan owner leave a 1–5 star rating after paying |
| `get_plan(plan_id)` | Read | Returns the full plan record as JSON |
| `get_user_plans(wallet_hex)` | Read | Returns the list of plan IDs for a wallet |
| `get_pricing()` | Read | Returns current GEN token prices for each duration |
| `update_pricing(duration_months, new_price)` | Write | Owner-only: update pricing |
| `transfer_ownership(new_owner_hex)` | Write | Owner-only: transfer contract ownership |
| `set_paused(paused)` | Write | Owner-only: pause or unpause the contract |

### Pricing (on-chain)

| Duration | Price |
|----------|-------|
| 1 Month  | 5 GEN |
| 3 Months | 12 GEN |
| 6 Months | 20 GEN |

Prices are stored as whole-GEN `u256` values in the contract and are updatable by the owner.

---

## Application Flow

```
User signs up → Supabase creates account + auto-generates ethers.js wallet
                (private key AES-256-GCM encrypted, stored in Supabase)
       ↓
6-Step Wizard:
  1. Personal Info  (age, weight, height)
  2. Goals          (lose weight / gain weight / build muscle / endurance / wellness)
  3. Dietary Prefs  (allergies, preferred proteins, region)
  4. Fitness Level  (beginner / intermediate / advanced)
  5. Duration       (1 / 3 / 6 months)
  6. Review & Save
       ↓
Profile saved → Plan record created with status: awaiting_payment
       ↓
User pays (GEN tokens deducted from their custodial wallet)
       ↓
Edge Function decrypts private key → calls submit_fitness_profile on GenLayer
Plan status: pending (consensus in progress)
       ↓
GenLayer validators run LLM consensus on the recipe (~30s–2min)
Plan status: unlocked
       ↓
User views full plan in dashboard → can download as PDF
```

### Payment Before Generation

The app uses a **pay-before-generate** flow. The profile is saved first and a plan record is created in `awaiting_payment` state. When the user confirms payment, the Edge Function submits the fitness profile to GenLayer, triggering on-chain consensus. This prevents users from getting plan previews without paying and ensures the GEN tokens are committed before computation begins.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Sonner toasts |
| **State** | Zustand |
| **Auth** | Supabase Auth (email + password) |
| **Database** | Supabase PostgreSQL with Row-Level Security |
| **Backend** | Supabase Edge Functions (Deno runtime) — no separate server |
| **Blockchain** | GenLayer StudioNet via `genlayer-js@1.1.8` |
| **Wallet** | Auto-generated `ethers.js` custodial wallet per user; private key encrypted with AES-256-GCM |
| **Smart Contract** | Python Intelligent Contract on GenLayer |
| **Hosting** | Vercel (frontend) |

---

## Edge Functions

All server-side logic runs as Supabase Edge Functions:

| Function | Purpose |
|----------|---------|
| `auth-signup` | Creates the user record and auto-generates + encrypts their wallet |
| `submit-plan` | Saves fitness profile and creates a plan in `awaiting_payment` state |
| `pay-for-plan` | Decrypts the user's private key, submits the profile to GenLayer, moves plan to `pending` |
| `poll-consensus` | Polls GenLayer for the transaction receipt to detect when consensus completes |
| `check-plan-status` | Returns the current plan status for the frontend to display |
| `get-plan-content` | Fetches and returns the full plan content once unlocked |
| `update-profile` | Upserts the user's fitness profile in the database |
| `wallet-info` | Returns the user's wallet address and GEN balance |
| `export-private-key` | Allows users to export their private key (authenticated) |
| `admin-update-pricing` | Owner-only: updates GEN pricing via the contract |
| `admin-plans` | Admin view of all plans and revenue |

---

## Project Structure

```
FitFam/
├── app/
│   ├── page.tsx                        # Landing page
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Sidebar + topbar layout
│   │   ├── dashboard/
│   │   │   ├── new-plan/page.tsx       # 6-step plan wizard
│   │   │   ├── plans/[id]/page.tsx     # Plan detail view
│   │   │   ├── wallet/page.tsx         # Wallet & GEN balance
│   │   │   └── settings/page.tsx       # Account settings
│   └── admin/page.tsx                  # Admin panel
├── components/
│   ├── landing/                        # Hero, HowItWorks, PricingCards, Testimonials, Footer, Navbar
│   ├── dashboard/                      # Sidebar, Topbar, PlanDetailClient, PlanRenderer, WalletClient, ConsensusLoader, SettingsClient
│   ├── forms/                          # NewPlanWizard, LoginForm, SignupForm
│   ├── admin/                          # AdminClient
│   └── shared/                         # Logo, ThemeToggle, FloatingOrbs
├── contracts/
│   └── fitness_plan.py                 # GenLayer Intelligent Contract
├── supabase/
│   └── functions/
│       ├── _shared/
│       │   ├── genlayer.ts             # GenLayer client helpers
│       │   └── plan-expander.ts        # Plan expansion utilities
│       ├── auth-signup/
│       ├── submit-plan/
│       ├── pay-for-plan/
│       ├── poll-consensus/
│       ├── check-plan-status/
│       ├── get-plan-content/
│       ├── update-profile/
│       ├── wallet-info/
│       ├── export-private-key/
│       ├── admin-update-pricing/
│       └── admin-plans/
├── lib/
│   └── supabase/
│       ├── client.ts                   # Browser Supabase client
│       └── server.ts                   # Server-side Supabase client
└── middleware.ts                       # Auth route protection
```

---

## Local Development

### Prerequisites

- Node.js 18+
- Supabase CLI
- A GenLayer StudioNet account and deployed contract

### Environment Variables

Create a `.env.local` file at the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AES-256-GCM key for encrypting user private keys (64-char hex)
ENCRYPTION_KEY=your_32_byte_hex_key

# GenLayer
GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address
CONTRACT_ADDRESS=your_deployed_contract_address
```

### Installation

```bash
npm install
npm run dev
```

### Database Setup

Run the SQL migrations in your Supabase SQL Editor in order:

1. `001_initial_schema` — creates the `users`, `fitness_profiles`, `plans`, `transactions`, and `pricing_config` tables
2. `002_rls_policies` — sets Row-Level Security policies so users can only access their own data
3. `003_cron_setup` — configures `pg_cron` jobs for background plan status polling

### Deploying Edge Functions

```bash
supabase functions deploy auth-signup
supabase functions deploy submit-plan
supabase functions deploy pay-for-plan
supabase functions deploy poll-consensus
supabase functions deploy check-plan-status
supabase functions deploy get-plan-content
supabase functions deploy update-profile
supabase functions deploy wallet-info
supabase functions deploy export-private-key
supabase functions deploy admin-update-pricing
supabase functions deploy admin-plans
```

Set the environment variables in your Supabase project dashboard under **Settings → Edge Functions → Secrets**.

### Deploying the GenLayer Contract

1. Open [GenLayer Studio](https://studio.genlayer.com)
2. Create a new Intelligent Contract and paste the contents of `contracts/fitness_plan.py`
3. Deploy to StudioNet
4. Copy the deployed contract address into your `.env.local` and Supabase Edge Function secrets

### Deploying the Frontend

```bash
vercel --prod
```

Set all the same environment variables in your Vercel project dashboard.

---

## How GenLayer Is Different

Traditional fitness apps call a centralized LLM API (OpenAI, Anthropic, etc.) and return whatever that single API responds with. You trust the company. There is no way to verify the output was not tampered with, cached incorrectly, or manipulated.

FitFam uses GenLayer so that:

- **Multiple independent validator nodes** each run the LLM separately and must agree on the recipe before any plan is recorded on-chain
- The plan generation is **transparent** — the contract code is public and the transaction is verifiable
- No single server controls the output — the consensus mechanism ensures consistency across validators
- The **exercise libraries, meal libraries, and expansion logic** are embedded in the contract itself, so the full plan is always reproducible from the on-chain recipe

---

## Smart Contract: Key Design Decisions

### Why a tiny recipe instead of a full LLM plan?

Asking an LLM to produce a full multi-week workout and nutrition plan in a single output introduces enormous variance between validator nodes. Even temperature-0 outputs differ slightly across models and hardware. A tiny JSON recipe with constrained fields (e.g. `"split": "upper_lower_4d"`, `"calories": 2400`, `"diet_style": "high_protein_balanced"`) is small enough that validators can agree on exact equality.

### Why Python Intelligent Contracts?

GenLayer Intelligent Contracts are written in Python and have access to `gl.get_webpage()`, `gl.exec_prompt()`, and other non-deterministic primitives alongside standard Python. The contract handles both the AI reasoning (recipe generation) and the deterministic business logic (expansion, pricing, ownership) in one place.

### Wallet custody

Each user gets an `ethers.js`-generated Ethereum wallet at signup. The private key is encrypted with AES-256-GCM before being stored in Supabase. The encryption key lives only in the Edge Function environment — never in the database. When a transaction is needed, the Edge Function decrypts the key in memory, signs and submits the transaction, then discards the key. Users can export their private key at any time from the wallet page.

---

## Live Contract

**Contract Address:** `0x2CE19654c18Ceb2A24Af43Dc82890673225EA71f`  
**Network:** GenLayer StudioNet  
**Explorer:** [studio.genlayer.com](https://studio.genlayer.com)

---

## License

MIT
