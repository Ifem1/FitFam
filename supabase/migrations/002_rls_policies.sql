-- RLS Policies (safe to re-run — drops existing before recreating)

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies so this migration is idempotent
DROP POLICY IF EXISTS "users_select_own"         ON public.users;
DROP POLICY IF EXISTS "users_update_own"         ON public.users;
DROP POLICY IF EXISTS "profiles_select_own"      ON public.fitness_profiles;
DROP POLICY IF EXISTS "profiles_insert_own"      ON public.fitness_profiles;
DROP POLICY IF EXISTS "profiles_update_own"      ON public.fitness_profiles;
DROP POLICY IF EXISTS "plans_select_own"         ON public.plans;
DROP POLICY IF EXISTS "plans_insert_own"         ON public.plans;
DROP POLICY IF EXISTS "transactions_select_own"  ON public.transactions;
DROP POLICY IF EXISTS "pricing_select_all"       ON public.pricing_config;

-- users: read and update own record only
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- fitness_profiles: users manage their own profiles
CREATE POLICY "profiles_select_own" ON public.fitness_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON public.fitness_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON public.fitness_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- plans: users see and create their own plans
CREATE POLICY "plans_select_own" ON public.plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "plans_insert_own" ON public.plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- transactions: users see their own transactions
CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

-- pricing_config: publicly readable by anyone
CREATE POLICY "pricing_select_all" ON public.pricing_config
  FOR SELECT USING (true);

-- Enable Realtime on the plans table
-- (so the frontend gets instant status updates when consensus lands)
ALTER PUBLICATION supabase_realtime ADD TABLE public.plans;
