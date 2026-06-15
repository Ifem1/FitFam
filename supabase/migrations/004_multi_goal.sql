-- Allow comma-separated goal_type values (up to 3 tracks)
ALTER TABLE public.fitness_profiles DROP CONSTRAINT IF EXISTS fitness_profiles_goal_type_check;
ALTER TABLE public.fitness_profiles ADD CONSTRAINT fitness_profiles_goal_type_check
  CHECK (goal_type ~ '^(lose_weight|gain_weight|build_muscle|improve_endurance|general_wellness)(,(lose_weight|gain_weight|build_muscle|improve_endurance|general_wellness)){0,2}$');

-- Add dietary preference columns (all optional)
ALTER TABLE public.fitness_profiles ADD COLUMN IF NOT EXISTS allergies TEXT DEFAULT '';
ALTER TABLE public.fitness_profiles ADD COLUMN IF NOT EXISTS preferred_proteins TEXT DEFAULT '';
ALTER TABLE public.fitness_profiles ADD COLUMN IF NOT EXISTS region TEXT DEFAULT '';
