-- FitFam Initial Schema
-- Run in Supabase SQL Editor or via Supabase CLI

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL,
  wallet_address        TEXT NOT NULL UNIQUE,
  encrypted_private_key TEXT NOT NULL,
  is_admin              BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Fitness profiles
CREATE TABLE IF NOT EXISTS public.fitness_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  age           INTEGER NOT NULL CHECK (age BETWEEN 10 AND 100),
  weight        NUMERIC(6,2) NOT NULL CHECK (weight > 0),
  weight_unit   TEXT NOT NULL CHECK (weight_unit IN ('kg', 'lbs')),
  height        NUMERIC(6,2) NOT NULL CHECK (height > 0),
  height_unit   TEXT NOT NULL CHECK (height_unit IN ('cm', 'ft')),
  fitness_level TEXT NOT NULL CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  goal_type     TEXT NOT NULL CHECK (goal_type IN (
                  'lose_weight', 'gain_weight', 'build_muscle',
                  'improve_endurance', 'general_wellness'
                )),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Plans
CREATE TABLE IF NOT EXISTS public.plans (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fitness_profile_id        UUID NOT NULL REFERENCES public.fitness_profiles(id),
  duration_months           INTEGER NOT NULL CHECK (duration_months IN (1, 3, 6)),
  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'consensus_reached', 'locked', 'unlocked', 'failed')),
  contract_transaction_hash TEXT,
  contract_plan_id          TEXT,
  price_gen                 NUMERIC(10,2) NOT NULL,
  payment_transaction_hash  TEXT,
  paid_at                   TIMESTAMPTZ,
  plan_content              JSONB,
  error_message             TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id          UUID REFERENCES public.plans(id),
  type             TEXT NOT NULL CHECK (type IN ('plan_submission', 'plan_payment')),
  transaction_hash TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'failed')),
  gen_amount       NUMERIC(10,2),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Pricing config
CREATE TABLE IF NOT EXISTS public.pricing_config (
  duration_months INTEGER PRIMARY KEY CHECK (duration_months IN (1, 3, 6)),
  price_gen       NUMERIC(10,2) NOT NULL CHECK (price_gen > 0),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default pricing
INSERT INTO public.pricing_config (duration_months, price_gen)
VALUES (1, 5.00), (3, 12.00), (6, 20.00)
ON CONFLICT (duration_months) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_status ON public.plans(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_profiles_user_id ON public.fitness_profiles(user_id);
