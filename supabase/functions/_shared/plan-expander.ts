// Server-side deterministic plan expansion
// Replicates the Python contract's _expand_plan logic and all lookup tables
// so plan content can be generated off-chain from the LLM recipe.

// ─── Types ───────────────────────────────────────────────────────────────────

interface Exercise {
  name: string
  beginner: string
  intermediate: string
  advanced: string
  rest: number
  muscles: string
  notes: string
}

interface Recipe {
  training_split: string
  intensity_curve: string
  calorie_target: number
  macro_ratio: { protein: number; carbs: number; fats: number }
  cardio_minutes_per_week: number
  diet_style: string
  recovery_priority: string
  personalization_notes: string
}

interface Profile {
  age: number
  weight: string
  weight_unit: string
  height: string
  height_unit: string
  fitness_level: string
  goal_type: string
  allergies?: string
  preferred_proteins?: string
  region?: string
}

// ─── EXERCISE LIBRARY ────────────────────────────────────────────────────────

const EXERCISE_LIBRARY: Record<string, Exercise[]> = {
  push_compound: [
    { name: "Barbell Bench Press", beginner: "3x8-10", intermediate: "4x6-8", advanced: "5x5", rest: 120, muscles: "chest, triceps, front delts", notes: "Keep shoulder blades retracted; bar to mid-chest" },
    { name: "Incline Dumbbell Press", beginner: "3x10-12", intermediate: "4x8-10", advanced: "4x6-8", rest: 90, muscles: "upper chest, front delts", notes: "45-degree bench; pause briefly at the bottom" },
    { name: "Overhead Barbell Press", beginner: "3x8-10", intermediate: "4x6-8", advanced: "5x5", rest: 120, muscles: "shoulders, triceps", notes: "Glutes squeezed; no excessive arch" },
    { name: "Dumbbell Shoulder Press", beginner: "3x10-12", intermediate: "4x8-10", advanced: "4x6-8", rest: 90, muscles: "shoulders, triceps", notes: "Press in slight arc; do not lock out hard" },
    { name: "Weighted Dips", beginner: "3x6-8", intermediate: "4x6-8", advanced: "5x5-8", rest: 120, muscles: "chest, triceps", notes: "Lean forward for chest; vertical for triceps" },
    { name: "Close-Grip Bench Press", beginner: "3x8-10", intermediate: "4x6-8", advanced: "4x5-6", rest: 90, muscles: "triceps, chest", notes: "Hands shoulder-width; elbows tucked" },
    { name: "Push-Up", beginner: "3x10-15", intermediate: "4x12-20", advanced: "4x20+", rest: 60, muscles: "chest, triceps, core", notes: "Full ROM; pause at chest just above floor" },
    { name: "Floor Press", beginner: "3x8-10", intermediate: "4x6-8", advanced: "4x5-6", rest: 90, muscles: "chest, triceps", notes: "Great for elbow-friendly pressing" },
  ],
  pull_compound: [
    { name: "Pull-Ups", beginner: "3xAMRAP", intermediate: "4x6-10", advanced: "5x6-10", rest: 120, muscles: "lats, biceps, mid-back", notes: "Use band assistance if needed; full hang to chin over bar" },
    { name: "Bent-Over Barbell Row", beginner: "3x8-10", intermediate: "4x6-8", advanced: "5x5", rest: 120, muscles: "lats, mid-back, biceps", notes: "Hinge to 45 degrees; pull to lower ribs" },
    { name: "One-Arm Dumbbell Row", beginner: "3x10-12", intermediate: "4x8-10", advanced: "4x6-8", rest: 90, muscles: "lats, mid-back", notes: "Hand on bench; pull elbow past torso" },
    { name: "Seated Cable Row", beginner: "3x10-12", intermediate: "4x8-10", advanced: "4x6-8", rest: 90, muscles: "mid-back, lats, biceps", notes: "Squeeze shoulder blades; control eccentric" },
    { name: "Lat Pulldown", beginner: "3x10-12", intermediate: "4x8-10", advanced: "4x6-8", rest: 90, muscles: "lats, biceps", notes: "Slight back lean; pull to upper chest" },
    { name: "T-Bar Row", beginner: "3x8-10", intermediate: "4x6-8", advanced: "4x6", rest: 120, muscles: "mid-back, lats", notes: "Chest supported version is safer for back" },
    { name: "Inverted Row", beginner: "3x10-12", intermediate: "3x12-15", advanced: "4x12-15", rest: 60, muscles: "mid-back, lats, biceps", notes: "Bodyweight; adjust difficulty by foot position" },
    { name: "Face Pull", beginner: "3x12-15", intermediate: "3x15-20", advanced: "4x15-20", rest: 60, muscles: "rear delts, mid-back", notes: "External rotation at end; great for posture" },
  ],
  leg_compound: [
    { name: "Back Squat", beginner: "3x8-10", intermediate: "4x6-8", advanced: "5x5", rest: 150, muscles: "quads, glutes, hamstrings", notes: "Hip crease below knee; brace core hard" },
    { name: "Front Squat", beginner: "3x6-8", intermediate: "4x5-6", advanced: "5x3-5", rest: 150, muscles: "quads, core, upper back", notes: "Elbows high; bar in front rack" },
    { name: "Deadlift", beginner: "3x5-6", intermediate: "4x4-5", advanced: "5x3-5", rest: 180, muscles: "posterior chain, traps", notes: "Bar over mid-foot; lats engaged" },
    { name: "Romanian Deadlift", beginner: "3x8-10", intermediate: "4x6-8", advanced: "4x6-8", rest: 120, muscles: "hamstrings, glutes", notes: "Hinge at hip; slight knee bend; bar travels close to leg" },
    { name: "Bulgarian Split Squat", beginner: "3x10/leg", intermediate: "4x8/leg", advanced: "4x6-8/leg", rest: 90, muscles: "quads, glutes", notes: "Rear foot elevated; torso upright" },
    { name: "Walking Lunges", beginner: "3x12/leg", intermediate: "4x10/leg", advanced: "4x8/leg", rest: 90, muscles: "quads, glutes, hamstrings", notes: "Long step; back knee close to ground" },
    { name: "Hip Thrust", beginner: "3x10-12", intermediate: "4x8-10", advanced: "4x6-8", rest: 90, muscles: "glutes", notes: "Drive heels; full hip lockout at top" },
    { name: "Leg Press", beginner: "3x12-15", intermediate: "4x10-12", advanced: "4x8-10", rest: 90, muscles: "quads, glutes", notes: "Feet shoulder-width; do not lock knees" },
    { name: "Goblet Squat", beginner: "3x10-12", intermediate: "3x10-12", advanced: "4x10-12", rest: 60, muscles: "quads, core", notes: "Elbows brush inside knees at bottom" },
    { name: "Single-Leg Romanian DL", beginner: "3x8/leg", intermediate: "3x10/leg", advanced: "4x10/leg", rest: 60, muscles: "hamstrings, glutes, balance", notes: "Free hand reaches floor; flat back" },
  ],
  core: [
    { name: "Plank", beginner: "3x30s", intermediate: "3x45-60s", advanced: "4x60s+", rest: 45, muscles: "deep core, shoulders", notes: "Brace as if punched; do not sag hips" },
    { name: "Hanging Knee Raise", beginner: "3x10-12", intermediate: "3x12-15", advanced: "4x15+", rest: 60, muscles: "lower abs, hip flexors", notes: "Slow controlled raise; no swing" },
    { name: "Cable Woodchopper", beginner: "3x12/side", intermediate: "3x12/side", advanced: "4x12/side", rest: 60, muscles: "obliques, core", notes: "Rotate from hips; arms stay straight" },
    { name: "Ab Wheel Rollout", beginner: "3x6-8", intermediate: "3x8-10", advanced: "4x10-12", rest: 90, muscles: "deep core, lats", notes: "Glutes squeezed; do not arch lower back" },
    { name: "Russian Twist (weighted)", beginner: "3x20", intermediate: "3x24", advanced: "4x30", rest: 45, muscles: "obliques", notes: "Feet elevated for harder version" },
    { name: "Dead Bug", beginner: "3x10/side", intermediate: "3x12/side", advanced: "3x15/side", rest: 45, muscles: "deep core, coordination", notes: "Lower back glued to floor" },
    { name: "Hollow Hold", beginner: "3x20-30s", intermediate: "3x30-45s", advanced: "4x45-60s", rest: 45, muscles: "deep core", notes: "Lower back flat; shoulders off floor" },
    { name: "Pallof Press", beginner: "3x10/side", intermediate: "3x12/side", advanced: "4x12/side", rest: 60, muscles: "anti-rotation core", notes: "Press straight out; resist rotation" },
    { name: "Side Plank", beginner: "3x20-30s/side", intermediate: "3x30-45s/side", advanced: "4x45s/side", rest: 45, muscles: "obliques", notes: "Stack hips; full body straight line" },
  ],
  cardio_steady: [
    { name: "Brisk Walking", beginner: "30 min", intermediate: "40 min", advanced: "45 min", rest: 0, muscles: "cardiovascular, recovery", notes: "Pace where you can talk but not sing" },
    { name: "Jogging", beginner: "20 min", intermediate: "30 min", advanced: "40 min", rest: 0, muscles: "cardiovascular, legs", notes: "Nasal breathing if possible — keeps pace honest" },
    { name: "Cycling (steady)", beginner: "30 min", intermediate: "45 min", advanced: "60 min", rest: 0, muscles: "cardiovascular, quads", notes: "Zone 2 — conversational pace" },
    { name: "Swimming (laps)", beginner: "20 min", intermediate: "30 min", advanced: "40 min", rest: 0, muscles: "full body cardio", notes: "Mix freestyle and breaststroke for variety" },
    { name: "Incline Treadmill Walk", beginner: "25 min", intermediate: "35 min", advanced: "45 min", rest: 0, muscles: "cardiovascular, glutes", notes: "5-10% incline; brisk pace" },
    { name: "Rowing (steady)", beginner: "20 min", intermediate: "30 min", advanced: "40 min", rest: 0, muscles: "full body cardio", notes: "Drive legs first, then back, then arms" },
    { name: "Elliptical", beginner: "25 min", intermediate: "35 min", advanced: "45 min", rest: 0, muscles: "low-impact cardio", notes: "Resist holding the rails" },
  ],
  cardio_hiit: [
    { name: "Sprint Intervals", beginner: "6 x 30s", intermediate: "8 x 30s", advanced: "10 x 30s", rest: 90, muscles: "cardiovascular, legs", notes: "All-out sprint, walk recovery" },
    { name: "Burpees", beginner: "4 x 30s", intermediate: "5 x 40s", advanced: "6 x 45s", rest: 60, muscles: "full body cardio", notes: "Crisp form even when fatigued" },
    { name: "Battle Ropes", beginner: "4 x 30s", intermediate: "5 x 40s", advanced: "6 x 45s", rest: 45, muscles: "shoulders, core, cardio", notes: "Big slams; brace core" },
    { name: "Kettlebell Swings", beginner: "4 x 20", intermediate: "5 x 25", advanced: "6 x 30", rest: 60, muscles: "posterior chain, cardio", notes: "Hip hinge; bell driven by hip snap" },
    { name: "Jump Rope", beginner: "5 x 60s", intermediate: "6 x 90s", advanced: "8 x 90s", rest: 45, muscles: "calves, cardio, coordination", notes: "Stay light on toes; quick wrists" },
    { name: "Box Jumps", beginner: "4 x 8", intermediate: "5 x 8", advanced: "6 x 8", rest: 60, muscles: "power, legs", notes: "Soft landing; step down, not jump down" },
    { name: "Mountain Climbers", beginner: "4 x 30s", intermediate: "5 x 40s", advanced: "6 x 45s", rest: 45, muscles: "core, cardio", notes: "Hips low; drive knees fast" },
  ],
  mobility: [
    { name: "World's Greatest Stretch", beginner: "2x5/side", intermediate: "2x6/side", advanced: "2x6/side", rest: 30, muscles: "hips, t-spine, hamstrings", notes: "Hold each position 2-3 seconds" },
    { name: "Hip 90/90 Switches", beginner: "2x8/side", intermediate: "2x10/side", advanced: "2x10/side", rest: 30, muscles: "hips", notes: "Stay tall; rotate from hips" },
    { name: "Cat-Cow", beginner: "2x10", intermediate: "2x12", advanced: "2x12", rest: 30, muscles: "spine mobility", notes: "Full ROM; sync with breath" },
    { name: "Thoracic Spine Rotation", beginner: "2x8/side", intermediate: "2x10/side", advanced: "2x10/side", rest: 30, muscles: "upper back", notes: "Side-lying or quadruped position" },
    { name: "Couch Stretch", beginner: "2x60s/side", intermediate: "2x90s/side", advanced: "2x90s/side", rest: 0, muscles: "hip flexors, quads", notes: "Tuck pelvis; do not over-arch" },
    { name: "Deep Squat Hold", beginner: "2x30s", intermediate: "2x45s", advanced: "2x60s", rest: 30, muscles: "hips, ankles", notes: "Heels down; elbows push knees out" },
    { name: "Banded Shoulder Dislocates", beginner: "2x10", intermediate: "2x12", advanced: "2x15", rest: 30, muscles: "shoulders", notes: "Wide grip; slow controlled arc" },
    { name: "Pigeon Stretch", beginner: "2x60s/side", intermediate: "2x90s/side", advanced: "2x90s/side", rest: 0, muscles: "glutes, hips", notes: "Square hips; lean forward gently" },
  ],
  arms_isolation: [
    { name: "Barbell Curl", beginner: "3x10-12", intermediate: "3x8-10", advanced: "4x6-8", rest: 60, muscles: "biceps", notes: "Elbows pinned to ribs; full ROM" },
    { name: "Hammer Curl", beginner: "3x10-12", intermediate: "3x10-12", advanced: "4x8-10", rest: 60, muscles: "biceps, brachialis, forearms", notes: "Neutral grip; do not swing" },
    { name: "Incline Dumbbell Curl", beginner: "3x10-12", intermediate: "3x8-10", advanced: "4x8-10", rest: 60, muscles: "long head of biceps", notes: "Full stretch at bottom" },
    { name: "Triceps Pushdown", beginner: "3x10-12", intermediate: "3x10-12", advanced: "4x8-10", rest: 60, muscles: "triceps", notes: "Elbows fixed; only forearm moves" },
    { name: "Overhead Triceps Extension", beginner: "3x10-12", intermediate: "3x10-12", advanced: "4x10-12", rest: 60, muscles: "long head of triceps", notes: "Full stretch overhead" },
    { name: "Skull Crusher", beginner: "3x10-12", intermediate: "3x8-10", advanced: "4x6-8", rest: 90, muscles: "triceps", notes: "Lower to forehead; do not flare elbows" },
    { name: "Cable Curl", beginner: "3x12-15", intermediate: "3x10-12", advanced: "4x8-10", rest: 60, muscles: "biceps", notes: "Constant tension throughout" },
    { name: "Reverse Curl", beginner: "3x12-15", intermediate: "3x10-12", advanced: "4x10-12", rest: 60, muscles: "forearms, brachialis", notes: "Overhand grip; control eccentric" },
  ],
  shoulders_isolation: [
    { name: "Lateral Raise", beginner: "3x12-15", intermediate: "4x10-12", advanced: "4x10-12", rest: 60, muscles: "side delts", notes: "Slight forward lean; lead with elbow" },
    { name: "Rear Delt Fly", beginner: "3x12-15", intermediate: "4x12-15", advanced: "4x12-15", rest: 60, muscles: "rear delts", notes: "Squeeze at top; no momentum" },
    { name: "Front Raise", beginner: "3x10-12", intermediate: "3x10-12", advanced: "4x10-12", rest: 60, muscles: "front delts", notes: "Control descent; do not swing" },
    { name: "Upright Row (light)", beginner: "3x12-15", intermediate: "3x10-12", advanced: "4x10-12", rest: 60, muscles: "side delts, traps", notes: "Use light weight; pain-free ROM only" },
    { name: "Cable Lateral Raise", beginner: "3x12-15", intermediate: "3x12-15", advanced: "4x10-12", rest: 60, muscles: "side delts", notes: "Constant tension version of lateral raise" },
  ],
  calves: [
    { name: "Standing Calf Raise", beginner: "4x12-15", intermediate: "4x12-15", advanced: "5x10-12", rest: 60, muscles: "gastrocnemius", notes: "Full stretch; pause briefly at top" },
    { name: "Seated Calf Raise", beginner: "4x15-20", intermediate: "4x15-20", advanced: "5x12-15", rest: 45, muscles: "soleus", notes: "Knees bent; slow tempo" },
    { name: "Single-Leg Calf Raise", beginner: "3x12/leg", intermediate: "3x15/leg", advanced: "4x15/leg", rest: 60, muscles: "calves, balance", notes: "Use wall for balance only" },
  ],
}

// ─── MEAL LIBRARY ────────────────────────────────────────────────────────────

interface DietStyle {
  label: string
  proteins: string[]
  carbs: string[]
  fats: string[]
  vegetables: string[]
  hydration: string
  avoid: string[]
}

const MEAL_LIBRARY: Record<string, DietStyle> = {
  high_protein_balanced: {
    label: "High-Protein Balanced",
    proteins: ["Chicken breast (150g)", "Lean ground turkey (150g)", "White fish — cod or tilapia (180g)", "Salmon (140g)", "Whole eggs + egg whites (3+4)", "Greek yogurt 0% fat (250g)", "Cottage cheese 2% (200g)", "Lean beef sirloin (140g)", "Tofu firm (200g)", "Whey protein shake (1 scoop)"],
    carbs: ["Oats (60g dry)", "Sweet potato (200g)", "Brown rice (60g dry)", "Quinoa (60g dry)", "Whole-grain bread (2 slices)", "Banana (1 medium)", "Berries (150g)", "Apple (1 large)", "Whole-wheat pasta (70g dry)"],
    fats: ["Avocado (1/2 fruit)", "Olive oil (1 tbsp)", "Almonds (28g)", "Walnuts (28g)", "Peanut butter natural (2 tbsp)", "Chia seeds (15g)", "Flaxseed ground (15g)"],
    vegetables: ["Spinach (150g)", "Broccoli (200g)", "Bell peppers (1 cup)", "Carrots (1 cup)", "Cucumber (1 cup)", "Mixed leafy greens (200g)", "Tomatoes (1 cup)", "Asparagus (150g)", "Cauliflower (200g)"],
    hydration: "3-4 litres of water daily; black coffee and unsweetened tea allowed",
    avoid: ["Sugary drinks and sodas", "Deep-fried foods", "Ultra-processed snacks (chips, candy)", "Excess refined white bread and pastries", "Alcohol (limit to 1-2 drinks per week if at all)"],
  },
  lean_bulk: {
    label: "Lean Bulk (Muscle Building)",
    proteins: ["Chicken thigh skinless (180g)", "Lean ground beef 90/10 (180g)", "Salmon (170g)", "Whole eggs (4)", "Greek yogurt 2% fat (300g)", "Cottage cheese (250g)", "Whey + casein protein shake", "Steak sirloin (180g)", "Whole milk (500ml)", "Tuna canned (200g)"],
    carbs: ["Oats (100g dry)", "White rice (100g dry)", "Sweet potato (300g)", "Whole-grain pasta (100g dry)", "Bagel (1 large)", "Bananas (2 medium)", "Rice cakes (4 cakes)", "Fruit (300g mixed)", "Whole-wheat tortilla (2 large)"],
    fats: ["Almonds (40g)", "Cashews (40g)", "Whole milk (500ml)", "Olive oil (2 tbsp)", "Avocado (1 whole)", "Peanut butter (3 tbsp)", "Cheese (40g)"],
    vegetables: ["Spinach (150g)", "Broccoli (200g)", "Mixed vegetables (300g)", "Salad greens (150g)"],
    hydration: "4 litres of water; milk also counts toward calorie target",
    avoid: ["Empty-calorie junk food despite the bulk", "Excessive sugary drinks", "Skipping meals (eat every 3-4 hours)"],
  },
  cut: {
    label: "Cutting Phase (Fat Loss)",
    proteins: ["Chicken breast (180g)", "Lean ground turkey 99% (180g)", "White fish cod or tilapia (200g)", "Egg whites (6) + whole eggs (2)", "Greek yogurt 0% (300g)", "Cottage cheese low-fat (250g)", "Tuna in water (200g)", "Whey isolate shake", "Tofu firm (250g)", "Lean steak (140g)"],
    carbs: ["Oats (40g dry)", "Sweet potato (150g)", "Berries (200g)", "Apple (1 medium)", "Brown rice (50g dry)", "Quinoa (50g dry)", "Cucumber (1 large)", "Leafy greens unlimited"],
    fats: ["Avocado (1/4 fruit)", "Olive oil (1 tbsp)", "Almonds (20g)", "Chia seeds (10g)", "Egg yolks (within egg allowance)"],
    vegetables: ["Spinach unlimited", "Broccoli unlimited", "Cauliflower unlimited", "Bell peppers unlimited", "Zucchini unlimited", "Asparagus (200g)", "Cucumbers and salad greens unlimited"],
    hydration: "4+ litres of water — appetite suppressant and metabolism support; black coffee allowed",
    avoid: ["All sugary drinks including fruit juice", "Refined carbs (white bread, pastries)", "Fried foods of any kind", "Alcohol entirely during cut", "Calorie-dense sauces and dressings"],
  },
  endurance_carb: {
    label: "Endurance Performance (Carb-Forward)",
    proteins: ["Chicken breast (150g)", "White fish (180g)", "Eggs (3-4)", "Greek yogurt (250g)", "Lean beef occasional (140g)", "Whey protein shake post-run", "Tofu (200g)"],
    carbs: ["Oats (100g dry)", "Whole-grain bread (3 slices)", "Brown rice (100g dry)", "Sweet potato (250g)", "Whole-wheat pasta (100g dry)", "Bananas (2-3)", "Dates (4-5)", "Fruit (400g mixed)", "Honey on oats (1 tbsp)"],
    fats: ["Almonds (28g)", "Olive oil (2 tbsp)", "Avocado (1/2)", "Chia seeds (15g)", "Nut butters (2 tbsp)"],
    vegetables: ["Spinach (150g)", "Beets (150g)", "Bell peppers (1 cup)", "Carrots (1 cup)", "Mixed greens (200g)"],
    hydration: "4-5 litres including electrolytes around long sessions; coconut water post-workout",
    avoid: ["Heavy fatty meals within 3 hours of training", "Excessive fiber pre-workout", "Alcohol during heavy training blocks"],
  },
  mediterranean: {
    label: "Mediterranean Wellness",
    proteins: ["Salmon (160g)", "White fish (180g)", "Sardines or mackerel (140g)", "Chicken breast (150g)", "Eggs (3)", "Greek yogurt (250g)", "Lentils cooked (200g)", "Chickpeas cooked (200g)", "Feta cheese (50g)", "Tofu (180g)"],
    carbs: ["Whole-grain bread (2-3 slices)", "Whole-wheat pasta (70g dry)", "Brown rice or farro (60g dry)", "Sweet potato (200g)", "Bulgur (60g dry)", "Fresh fruit (300g)"],
    fats: ["Extra virgin olive oil (2-3 tbsp)", "Avocado (1/2)", "Olives (50g)", "Walnuts (28g)", "Almonds (28g)", "Tahini (1 tbsp)"],
    vegetables: ["Tomatoes (1 cup)", "Cucumber (1 cup)", "Bell peppers (1 cup)", "Eggplant (1 cup)", "Spinach (150g)", "Mixed leafy greens (200g)", "Onions and garlic generously"],
    hydration: "3 litres water; red wine 1 small glass max 2x/week optional",
    avoid: ["Ultra-processed foods", "Refined seed oils for cooking (use olive oil)", "Sugary desserts daily (limit to occasional)"],
  },
}

// ─── TRAINING SPLITS ─────────────────────────────────────────────────────────

interface SplitDay {
  day: string
  categories: string[]
}

interface TrainingSplit {
  label: string
  days_per_week: number
  schedule: SplitDay[]
}

const TRAINING_SPLITS: Record<string, TrainingSplit> = {
  full_body_3d: {
    label: "Full Body 3-Day",
    days_per_week: 3,
    schedule: [
      { day: "Monday", categories: ["leg_compound", "push_compound", "pull_compound", "core"] },
      { day: "Tuesday", categories: ["mobility"] },
      { day: "Wednesday", categories: ["leg_compound", "push_compound", "pull_compound", "core"] },
      { day: "Thursday", categories: ["mobility", "cardio_steady"] },
      { day: "Friday", categories: ["leg_compound", "push_compound", "pull_compound", "core"] },
      { day: "Saturday", categories: ["cardio_steady", "mobility"] },
      { day: "Sunday", categories: ["mobility"] },
    ],
  },
  upper_lower_4d: {
    label: "Upper / Lower 4-Day",
    days_per_week: 4,
    schedule: [
      { day: "Monday", categories: ["push_compound", "pull_compound", "shoulders_isolation", "core"] },
      { day: "Tuesday", categories: ["leg_compound", "calves", "core"] },
      { day: "Wednesday", categories: ["mobility"] },
      { day: "Thursday", categories: ["pull_compound", "push_compound", "arms_isolation", "core"] },
      { day: "Friday", categories: ["leg_compound", "calves", "core"] },
      { day: "Saturday", categories: ["cardio_steady", "mobility"] },
      { day: "Sunday", categories: ["mobility"] },
    ],
  },
  push_pull_legs_5d: {
    label: "Push / Pull / Legs 5-Day",
    days_per_week: 5,
    schedule: [
      { day: "Monday", categories: ["push_compound", "shoulders_isolation", "arms_isolation"] },
      { day: "Tuesday", categories: ["pull_compound", "arms_isolation", "core"] },
      { day: "Wednesday", categories: ["leg_compound", "calves", "core"] },
      { day: "Thursday", categories: ["push_compound", "shoulders_isolation", "arms_isolation"] },
      { day: "Friday", categories: ["pull_compound", "arms_isolation", "core"] },
      { day: "Saturday", categories: ["cardio_steady", "mobility"] },
      { day: "Sunday", categories: ["mobility"] },
    ],
  },
  bro_split_5d: {
    label: "Body-Part Split 5-Day",
    days_per_week: 5,
    schedule: [
      { day: "Monday", categories: ["push_compound", "shoulders_isolation"] },
      { day: "Tuesday", categories: ["pull_compound"] },
      { day: "Wednesday", categories: ["leg_compound", "calves"] },
      { day: "Thursday", categories: ["shoulders_isolation", "core"] },
      { day: "Friday", categories: ["arms_isolation", "core"] },
      { day: "Saturday", categories: ["cardio_steady", "mobility"] },
      { day: "Sunday", categories: ["mobility"] },
    ],
  },
  athletic_4d: {
    label: "Athletic Conditioning 4-Day",
    days_per_week: 4,
    schedule: [
      { day: "Monday", categories: ["leg_compound", "core", "cardio_hiit"] },
      { day: "Tuesday", categories: ["push_compound", "pull_compound", "core"] },
      { day: "Wednesday", categories: ["mobility", "cardio_steady"] },
      { day: "Thursday", categories: ["leg_compound", "core", "cardio_hiit"] },
      { day: "Friday", categories: ["push_compound", "pull_compound", "core"] },
      { day: "Saturday", categories: ["cardio_steady", "mobility"] },
      { day: "Sunday", categories: ["mobility"] },
    ],
  },
}

// ─── INTENSITY CURVES & WEEKLY THEMES ────────────────────────────────────────

const INTENSITY_CURVES: Record<string, { label: string; description: string }> = {
  linear: { label: "Linear Progression", description: "Add small load or volume each week — best for beginners and early-intermediate trainees." },
  wave: { label: "Wave Loading", description: "3 weeks of building intensity followed by a 1-week deload — sustainable for intermediates." },
  block: { label: "Block Periodisation", description: "4-week blocks alternating hypertrophy → strength → peaking — for advanced trainees." },
}

const LINEAR_THEMES = [
  "Foundation Week — Movement Quality", "Foundation Week — Light Load Building",
  "Build Phase — Volume Increase", "Build Phase — Load Progression", "Build Phase — Density Work",
  "Intensification — Heavier Loads", "Intensification — Push for PRs", "Deload / Recovery Week",
  "Reload — Re-Approach Top Loads", "Peak Phase — Strength Test", "Peak Phase — Volume + Strength",
  "Peak Phase — Conditioning Focus", "Consolidation — Sustainable Output", "Consolidation — Personal Records",
  "Consolidation — Skill Refinement", "Reset Week — Active Recovery", "Reset Week — Mobility Focus",
  "Final Push — Sustained Effort", "Final Push — Test Week", "Final Push — Hold the Line",
  "Capstone — Personal Best Attempts", "Capstone — Combined Conditioning", "Capstone — Volume Tolerance", "Capstone — Final Test Week",
]

const WAVE_THEMES = [
  "Wave 1 — Accumulation", "Wave 1 — Intensification", "Wave 1 — Peak", "Wave 1 — Deload",
  "Wave 2 — Accumulation (heavier)", "Wave 2 — Intensification", "Wave 2 — Peak", "Wave 2 — Deload",
  "Wave 3 — Accumulation", "Wave 3 — Intensification", "Wave 3 — Peak", "Wave 3 — Deload",
  "Wave 4 — Accumulation", "Wave 4 — Intensification", "Wave 4 — Peak", "Wave 4 — Deload",
  "Wave 5 — Accumulation", "Wave 5 — Intensification", "Wave 5 — Peak", "Wave 5 — Deload",
  "Wave 6 — Accumulation", "Wave 6 — Intensification", "Wave 6 — Peak", "Wave 6 — Final Test",
]

const BLOCK_THEMES = [
  "Hypertrophy Block — Week 1", "Hypertrophy Block — Week 2", "Hypertrophy Block — Week 3", "Hypertrophy Block — Deload",
  "Strength Block — Week 1", "Strength Block — Week 2", "Strength Block — Week 3", "Strength Block — Deload",
  "Peaking Block — Week 1", "Peaking Block — Week 2", "Peaking Block — Week 3", "Peaking Block — Test Week",
  "Reset Block — Mobility & GPP",
  "Hypertrophy Block 2 — Week 1", "Hypertrophy Block 2 — Week 2", "Hypertrophy Block 2 — Week 3", "Hypertrophy Block 2 — Deload",
  "Strength Block 2 — Week 1", "Strength Block 2 — Week 2", "Strength Block 2 — Week 3", "Strength Block 2 — Deload",
  "Peaking Block 2 — Week 1", "Peaking Block 2 — Week 2", "Peaking Block 2 — Final Test",
]

// ─── RECOVERY & MOTIVATION ──────────────────────────────────────────────────

const RECOVERY_GUIDANCE_HIGH = [
  "Sleep 8-9 hours per night — non-negotiable; recovery is when adaptation happens",
  "10 minutes of static stretching after every training session",
  "Take at least 1 full rest day per week — schedule it, honour it",
  "Walk 8000+ steps daily on non-training days for circulation and recovery",
  "Foam roll major muscle groups 3-4 times per week, 5 minutes per area",
  "Consider 1-2 contrast showers per week (alternate hot/cold for 30 seconds each)",
  "Magnesium-rich foods or supplementation in the evening to support sleep",
]

const RECOVERY_GUIDANCE_MODERATE = [
  "Sleep 7-8 hours per night — guard this aggressively",
  "Light static stretching after sessions (5-10 minutes on tight areas)",
  "1-2 rest days per week depending on session intensity",
  "Walk daily — at minimum 6000 steps",
  "Foam roll 2-3 times per week on tightest areas",
]

const RECOVERY_GUIDANCE_LOW = [
  "Sleep at least 7 hours per night",
  "Brief cooldown stretching after sessions",
  "1 rest day per week — listen to your body for a second if needed",
  "Keep daily activity up — walks, taking stairs, standing breaks",
]

const MOTIVATION_TIPS = [
  "Log every workout — visible progress compounds motivation over time",
  "Prepare meals in advance — removes willpower friction on busy days",
  "Set a weekly non-scale goal (e.g. 5 workouts completed) alongside body goals",
  "Take progress photos every 2 weeks in the same lighting and pose",
  "Track lifts in a notebook or app — beating last week's numbers is the game",
  "Find a training partner or remote accountability buddy you check in with weekly",
  "When motivation dips, lower the bar — just show up and do something light",
  "Reward consistency, not outcomes — outcomes follow consistency",
  "Eat the same 3-4 reliable breakfasts on rotation to reduce decision fatigue",
  "Pack your gym bag the night before sessions",
  "Schedule workouts in your calendar as non-negotiable appointments",
  "Celebrate small wins weekly — first unassisted pull-up, faster 5K, better sleep",
]

// ─── MILESTONES BY GOAL ──────────────────────────────────────────────────────

const MILESTONES_BY_GOAL: Record<string, string[]> = {
  lose_weight: [
    "Bodyweight down 1-2% with waist measurement reduced",
    "Energy noticeably stable through the day; no afternoon crashes",
    "All workouts completed at planned intensity 3 weeks running",
    "Resting heart rate dropped by 3-5 BPM from baseline",
    "Clothes fitting noticeably looser around waist and hips",
    "Bodyweight down 4-6% from start with strength maintained",
    "Cardio endurance improved — 5K time or treadmill duration up",
    "Mid-program photo check shows clear visual change",
    "Strength on key lifts (squat, press, row) maintained or improved despite deficit",
    "Goal weight reached or within 2 kg of target",
  ],
  gain_weight: [
    "Bodyweight up 0.5-1 kg with grip and lifts trending up",
    "All meals hit consistently for 3 weeks; appetite adapting",
    "Bench press up 5-10 kg from baseline",
    "Squat up 10-15 kg from baseline",
    "Arms and chest measurements up 1-2 cm",
    "Bodyweight up 2-3 kg with clear strength gains across all lifts",
    "Sleep quality improving despite higher food volume",
    "Photos show fuller appearance, especially shoulders and arms",
    "Pull-ups or row weight up significantly",
    "Goal weight reached with most gain in lean tissue",
  ],
  build_muscle: [
    "All sets completed at prescribed reps for 3 sessions running",
    "Mind-muscle connection sharpened — feeling target muscle work",
    "Bench press up 5-7.5 kg; rows up similarly",
    "Visible pump and fullness post-training",
    "Arm and chest measurements up 1 cm",
    "Squat and deadlift up 7.5-15 kg",
    "Recovery between sessions feels easier",
    "Mid-program photos show visible muscle development",
    "Compound lifts at new personal bests",
    "Full target physique milestones reached",
  ],
  improve_endurance: [
    "Resting heart rate dropped 3-5 BPM",
    "Steady-state cardio session feels notably easier at same pace",
    "Recovery between intervals faster",
    "5K pace improved by 20-30 seconds per km (or equivalent)",
    "Long-session distance increased 15-25%",
    "Race-pace heart rate dropped at same effort",
    "Speed work intervals at faster paces than baseline",
    "VO2-max test (or proxy) improved by 5%+",
    "Conversational pace is meaningfully faster than baseline",
    "Target distance or race time achieved",
  ],
  general_wellness: [
    "Daily energy more stable; no afternoon crashes",
    "Sleep quality up — falling asleep faster, fewer wakeups",
    "Mood more even and stress more manageable",
    "Posture noticeably improved (less rounding, neutral neck)",
    "Daily step count consistently above 8000",
    "Resting heart rate trending down",
    "Strength on key movements (squat, push-up, row) up clearly",
    "Mobility test scores improved across hips and shoulders",
    "Body composition shift visible without focused dieting",
    "Habits sustainable — easy to imagine continuing past program",
  ],
}

// ─── CALORIE / MACRO / DIET DEFAULTS ─────────────────────────────────────────

const GOAL_CALORIE_DEFAULTS: Record<string, number> = {
  lose_weight: 1800, gain_weight: 2900, build_muscle: 2700,
  improve_endurance: 2500, general_wellness: 2200,
}

const GOAL_MACRO_DEFAULTS: Record<string, { protein: number; carbs: number; fats: number }> = {
  lose_weight: { protein: 0.40, carbs: 0.35, fats: 0.25 },
  gain_weight: { protein: 0.25, carbs: 0.50, fats: 0.25 },
  build_muscle: { protein: 0.30, carbs: 0.45, fats: 0.25 },
  improve_endurance: { protein: 0.20, carbs: 0.60, fats: 0.20 },
  general_wellness: { protein: 0.25, carbs: 0.45, fats: 0.30 },
}

const GOAL_DIET_DEFAULTS: Record<string, string> = {
  lose_weight: "cut", gain_weight: "lean_bulk", build_muscle: "high_protein_balanced",
  improve_endurance: "endurance_carb", general_wellness: "mediterranean",
}

// ─── WARMUP PROTOCOLS ────────────────────────────────────────────────────────

interface WarmupStep { exercise: string; duration: string; notes: string }
interface WarmupProtocol { title: string; steps: WarmupStep[] }

const WARMUP_PROTOCOLS: Record<string, WarmupProtocol> = {
  upper_body: {
    title: "Upper Body Warm-Up (8-10 minutes)",
    steps: [
      { exercise: "Arm Circles (forward & backward)", duration: "30 seconds each direction", notes: "Start small, progressively widen the circles" },
      { exercise: "Band Pull-Aparts", duration: "2 x 15 reps", notes: "Light band; squeeze shoulder blades together at the end of each rep" },
      { exercise: "Shoulder Dislocates with PVC/Band", duration: "2 x 10 reps", notes: "Slow and controlled; widen grip if range of motion is limited" },
      { exercise: "Cat-Cow Stretch", duration: "10 reps", notes: "Full breath cycle each rep; mobilise the thoracic spine" },
      { exercise: "Push-Up to Downward Dog", duration: "2 x 6 reps", notes: "Flow through smoothly; opens hamstrings and shoulders simultaneously" },
      { exercise: "Light Dumbbell/Bar Warm-Up Sets", duration: "2 x 12 at 40-50% working weight", notes: "Prime the movement pattern for your first exercise of the day" },
    ],
  },
  lower_body: {
    title: "Lower Body Warm-Up (10-12 minutes)",
    steps: [
      { exercise: "Bodyweight Squats", duration: "2 x 15 reps", notes: "Full depth; focus on sitting between heels, knees tracking over toes" },
      { exercise: "Hip Circles (standing)", duration: "10 each direction per leg", notes: "Open the hip capsule; hold a wall for balance" },
      { exercise: "Walking Knee Hugs", duration: "10 steps each leg", notes: "Pull knee to chest; squeeze glute of the standing leg" },
      { exercise: "Walking Lunges (bodyweight)", duration: "10 steps each leg", notes: "Deep stretch at the bottom; torso upright" },
      { exercise: "Glute Bridges", duration: "2 x 12 reps", notes: "Squeeze at the top for 2 seconds; activates glutes before heavy lifts" },
      { exercise: "Leg Swings (front-to-back & side-to-side)", duration: "10 each direction per leg", notes: "Hold a rack for stability; progressive range of motion" },
      { exercise: "Light Bar Warm-Up Sets", duration: "2 x 10 at 40-50% working weight", notes: "Prime the squat or deadlift pattern with the empty bar or light load" },
    ],
  },
  full_body: {
    title: "Full-Body Warm-Up (8-10 minutes)",
    steps: [
      { exercise: "Jumping Jacks", duration: "60 seconds", notes: "Get heart rate up; land softly" },
      { exercise: "World's Greatest Stretch", duration: "5 per side", notes: "Lunge, rotate, reach — mobilises hips, t-spine, and hamstrings" },
      { exercise: "Inchworm Walk-Out", duration: "8 reps", notes: "Walk hands out to plank, walk feet to hands; keep legs as straight as possible" },
      { exercise: "Band Pull-Aparts", duration: "15 reps", notes: "Light band; rear delt and upper back activation" },
      { exercise: "Bodyweight Squats", duration: "15 reps", notes: "Sit deep; pause at the bottom of the last 5 reps" },
      { exercise: "Light Warm-Up Set of First Exercise", duration: "2 x 10 at 40-50% working weight", notes: "Groove the motor pattern before loading up" },
    ],
  },
  cardio: {
    title: "Cardio Warm-Up (5-7 minutes)",
    steps: [
      { exercise: "Brisk Walk / Light Jog", duration: "3 minutes", notes: "Gradually increase pace from walking to a gentle jog" },
      { exercise: "Dynamic Leg Swings", duration: "10 each direction per leg", notes: "Loosen hips and hamstrings before sustained effort" },
      { exercise: "High Knees (in place)", duration: "30 seconds", notes: "Quick feet; drive knees to hip height" },
      { exercise: "Butt Kicks (in place)", duration: "30 seconds", notes: "Quick feet; heel to glute" },
      { exercise: "Calf Raises (bodyweight)", duration: "15 reps", notes: "Full stretch at bottom; prevents calf cramping mid-session" },
    ],
  },
  mobility: {
    title: "Mobility Day Dynamic Warm-Up (5 minutes)",
    steps: [
      { exercise: "Cat-Cow", duration: "10 reps", notes: "Sync with breathing; full spinal flexion and extension" },
      { exercise: "Hip 90/90 Switches", duration: "8 per side", notes: "Sit tall; rotate from the hips" },
      { exercise: "Thoracic Rotation (side-lying)", duration: "8 per side", notes: "Reach and open; follow hand with eyes" },
    ],
  },
}

const COOLDOWN_PROTOCOL = {
  title: "Post-Workout Cool-Down (5-8 minutes)",
  steps: [
    { exercise: "Slow Walk / Easy Pace", duration: "2 minutes", notes: "Bring heart rate down gradually; deep nasal breaths" },
    { exercise: "Standing Quad Stretch", duration: "30 seconds per leg", notes: "Hold wall for balance; squeeze glute of the stretched leg" },
    { exercise: "Standing Hamstring Stretch (foot on bench)", duration: "30 seconds per leg", notes: "Hinge at hip; flat back; reach toward toes" },
    { exercise: "Chest Doorway Stretch", duration: "30 seconds per side", notes: "Elbow at 90 degrees on door frame; lean through gently" },
    { exercise: "Cross-Body Shoulder Stretch", duration: "20 seconds per arm", notes: "Pull arm across body at chest height" },
    { exercise: "Child's Pose", duration: "30 seconds", notes: "Knees wide; sink hips to heels; arms extended overhead on the floor" },
    { exercise: "Deep Breathing (box breathing)", duration: "4 rounds of 4-4-4-4", notes: "Inhale 4 seconds, hold 4, exhale 4, hold 4 — activates parasympathetic recovery" },
  ],
}

// ─── SUPPLEMENT RECOMMENDATIONS ──────────────────────────────────────────────

interface Supplement { name: string; dose: string; reason: string }

const SUPPLEMENT_RECS: Record<string, Supplement[]> = {
  lose_weight: [
    { name: "Whey Protein Isolate", dose: "25-30g post-workout or as a meal supplement", reason: "Preserves lean mass during a calorie deficit; highest satiety per calorie of any protein source" },
    { name: "Caffeine", dose: "100-200mg before training (or black coffee)", reason: "Enhances fat oxidation and workout performance during an energy deficit" },
    { name: "Creatine Monohydrate", dose: "5g daily", reason: "Maintains strength and muscle mass despite reduced calories; well-researched and safe" },
    { name: "Omega-3 Fish Oil", dose: "2-3g EPA+DHA daily", reason: "Supports cardiovascular health and reduces diet-related inflammation" },
    { name: "Multivitamin", dose: "1 daily with food", reason: "Insurance against micronutrient gaps from restricted food intake during a cut" },
    { name: "Fiber Supplement (psyllium husk)", dose: "5-10g in water before main meals", reason: "Increases satiety and supports digestive regularity during calorie restriction" },
  ],
  gain_weight: [
    { name: "Whey + Casein Protein Blend", dose: "30-40g post-workout; casein shake before bed", reason: "Sustained amino acid delivery supports around-the-clock muscle protein synthesis" },
    { name: "Creatine Monohydrate", dose: "5g daily", reason: "Increases intra-cellular water, strength, and training volume capacity — the most proven supplement for mass gain" },
    { name: "Mass Gainer or Homemade Shake", dose: "500-700 kcal shake on hard-to-eat days", reason: "Liquid calories are easier to consume when appetite is the bottleneck" },
    { name: "Omega-3 Fish Oil", dose: "2-3g EPA+DHA daily", reason: "Anti-inflammatory support as training volume increases" },
    { name: "Vitamin D3", dose: "2000-4000 IU daily", reason: "Supports testosterone production, immune function, and bone health during heavy loading" },
    { name: "Zinc + Magnesium (ZMA)", dose: "As directed, before bed", reason: "Supports recovery, sleep quality, and hormonal balance under high training stress" },
  ],
  build_muscle: [
    { name: "Whey Protein Isolate", dose: "25-40g post-workout", reason: "Fast-digesting protein to kickstart muscle repair immediately after training" },
    { name: "Creatine Monohydrate", dose: "5g daily (no loading needed)", reason: "Increases strength output, cell volumisation, and recovery — the gold standard for hypertrophy support" },
    { name: "Beta-Alanine", dose: "3-6g daily (split doses to reduce tingling)", reason: "Buffers lactic acid in higher-rep sets; particularly effective for 8-15 rep ranges" },
    { name: "Citrulline Malate", dose: "6-8g 30-40 minutes pre-workout", reason: "Enhances blood flow and muscle pump; may improve rep performance in later sets" },
    { name: "Omega-3 Fish Oil", dose: "2-3g EPA+DHA daily", reason: "Reduces muscle soreness and supports joint health under heavy loading" },
    { name: "Vitamin D3 + K2", dose: "2000-4000 IU D3 + 100mcg K2 daily", reason: "Bone density support and immune function — critical under progressive overload" },
  ],
  improve_endurance: [
    { name: "Electrolyte Mix", dose: "During and after long sessions (>60 min)", reason: "Replaces sodium, potassium, and magnesium lost through sweat; prevents cramping and fatigue" },
    { name: "Caffeine", dose: "100-200mg before sessions", reason: "Improves perceived effort and time-to-exhaustion in endurance activities" },
    { name: "Beta-Alanine", dose: "3-6g daily", reason: "Buffers acid build-up during sustained efforts; effective for threshold work" },
    { name: "Iron (if blood work indicates deficiency)", dose: "As directed by a doctor", reason: "Low iron destroys endurance performance; get tested before supplementing" },
    { name: "Beetroot Powder / Juice", dose: "500ml juice or 6g powder 2-3 hours pre-session", reason: "Nitric oxide precursor; shown to improve oxygen efficiency by 3-5%" },
    { name: "Whey Protein", dose: "20-25g post-session", reason: "Repair and recovery even though endurance is the focus — muscle damage still occurs" },
  ],
  general_wellness: [
    { name: "Multivitamin", dose: "1 daily with food", reason: "Baseline micronutrient coverage; fills gaps in a varied but imperfect diet" },
    { name: "Omega-3 Fish Oil", dose: "2g EPA+DHA daily", reason: "Heart health, brain function, and anti-inflammatory benefits" },
    { name: "Vitamin D3", dose: "1000-2000 IU daily (more if deficient)", reason: "Most adults are deficient; supports immune function, mood, and bone health" },
    { name: "Magnesium Glycinate", dose: "200-400mg before bed", reason: "Supports sleep quality, muscle relaxation, and stress management" },
    { name: "Probiotic", dose: "1 capsule daily with food", reason: "Supports gut health, which affects energy, immunity, and nutrient absorption" },
    { name: "Creatine Monohydrate", dose: "3-5g daily", reason: "Emerging research shows cognitive and longevity benefits beyond just muscle and strength" },
  ],
}

// ─── SAMPLE MEAL PLANS ───────────────────────────────────────────────────────

interface Meal { time: string; foods: string; macros: string }
interface MealPlanDay { label: string; meals: Meal[] }

const SAMPLE_MEAL_PLANS: Record<string, MealPlanDay[]> = {
  high_protein_balanced: [
    { label: "Sample Day A (Training Day)", meals: [
      { time: "Meal 1 — Breakfast (7:00 AM)", foods: "3 whole eggs scrambled + 100g egg whites | 60g oats with 1 tbsp peanut butter + sliced banana | Black coffee", macros: "~45g P / 55g C / 20g F — ~580 kcal" },
      { time: "Meal 2 — Lunch (12:00 PM)", foods: "150g grilled chicken breast | 200g sweet potato baked | 200g steamed broccoli + 150g spinach salad with 1 tbsp olive oil", macros: "~45g P / 45g C / 15g F — ~500 kcal" },
      { time: "Meal 3 — Pre-Workout Snack (3:30 PM)", foods: "250g Greek yogurt 0% fat + 150g mixed berries + 28g almonds", macros: "~30g P / 25g C / 14g F — ~350 kcal" },
      { time: "Meal 4 — Post-Workout (6:30 PM)", foods: "1 scoop whey protein + 1 banana + 60g brown rice cooked with 150g grilled salmon", macros: "~50g P / 50g C / 18g F — ~560 kcal" },
      { time: "Meal 5 — Dinner (8:30 PM)", foods: "200g cottage cheese 2% + 1 tbsp chia seeds + cinnamon", macros: "~28g P / 10g C / 8g F — ~220 kcal" },
    ]},
    { label: "Sample Day B (Rest Day)", meals: [
      { time: "Meal 1 — Breakfast (8:00 AM)", foods: "200g cottage cheese + 150g berries + 15g flaxseed | Green tea", macros: "~30g P / 22g C / 10g F — ~300 kcal" },
      { time: "Meal 2 — Lunch (12:30 PM)", foods: "180g white fish (cod) baked with lemon + 200g quinoa + large mixed greens salad with cucumber, tomato, 1 tbsp olive oil", macros: "~42g P / 45g C / 14g F — ~470 kcal" },
      { time: "Meal 3 — Afternoon Snack (3:30 PM)", foods: "1 large apple + 2 tbsp natural peanut butter", macros: "~8g P / 30g C / 16g F — ~290 kcal" },
      { time: "Meal 4 — Dinner (7:00 PM)", foods: "150g lean ground turkey stir-fry with 200g bell peppers, carrots, broccoli over 60g brown rice", macros: "~40g P / 40g C / 12g F — ~430 kcal" },
      { time: "Meal 5 — Evening (9:00 PM)", foods: "250g Greek yogurt 0% + 28g walnuts", macros: "~25g P / 12g C / 16g F — ~290 kcal" },
    ]},
  ],
  lean_bulk: [
    { label: "Sample Day A (Heavy Training Day)", meals: [
      { time: "Meal 1 — Breakfast (7:00 AM)", foods: "100g oats + 500ml whole milk + 1 scoop whey + 2 tbsp peanut butter + sliced banana", macros: "~55g P / 80g C / 30g F — ~810 kcal" },
      { time: "Meal 2 — Mid-Morning (10:00 AM)", foods: "4 whole eggs scrambled + 2 slices whole-grain toast + 1/2 avocado", macros: "~35g P / 30g C / 30g F — ~530 kcal" },
      { time: "Meal 3 — Lunch (1:00 PM)", foods: "180g chicken thigh grilled + 100g white rice + 200g mixed vegetables + 40g cheese", macros: "~50g P / 50g C / 22g F — ~600 kcal" },
      { time: "Meal 4 — Pre-Workout (4:00 PM)", foods: "Large bagel + 2 tbsp peanut butter + banana + 300ml milk", macros: "~25g P / 70g C / 18g F — ~540 kcal" },
      { time: "Meal 5 — Post-Workout (7:00 PM)", foods: "180g lean beef sirloin + 300g sweet potato + steamed broccoli (200g)", macros: "~50g P / 60g C / 15g F — ~580 kcal" },
      { time: "Meal 6 — Before Bed (9:30 PM)", foods: "300g Greek yogurt 2% + 40g cashews + 1 tbsp honey", macros: "~30g P / 30g C / 20g F — ~420 kcal" },
    ]},
    { label: "Sample Day B (Light Training / Active Recovery)", meals: [
      { time: "Meal 1 — Breakfast (8:00 AM)", foods: "4 whole eggs + 100g smoked salmon + 2 slices sourdough toast", macros: "~45g P / 30g C / 25g F — ~530 kcal" },
      { time: "Meal 2 — Mid-Morning (10:30 AM)", foods: "Whey + casein shake (2 scoops) + 500ml whole milk + 1 banana", macros: "~55g P / 40g C / 18g F — ~540 kcal" },
      { time: "Meal 3 — Lunch (1:00 PM)", foods: "200g tuna (canned) mixed with mayo + 100g whole-wheat pasta + side salad", macros: "~50g P / 55g C / 15g F — ~560 kcal" },
      { time: "Meal 4 — Afternoon (4:00 PM)", foods: "250g cottage cheese + 4 rice cakes + 2 tbsp almond butter", macros: "~35g P / 40g C / 18g F — ~460 kcal" },
      { time: "Meal 5 — Dinner (7:00 PM)", foods: "180g steak + 200g mashed potato with butter + roasted asparagus (150g)", macros: "~48g P / 40g C / 22g F — ~550 kcal" },
      { time: "Meal 6 — Before Bed (9:30 PM)", foods: "300g Greek yogurt + 40g mixed nuts + berries (100g)", macros: "~30g P / 25g C / 22g F — ~420 kcal" },
    ]},
  ],
  cut: [
    { label: "Sample Day A (Training Day)", meals: [
      { time: "Meal 1 — Breakfast (7:00 AM)", foods: "6 egg whites + 2 whole eggs scrambled with spinach and tomato | 40g oats with cinnamon | Black coffee", macros: "~40g P / 28g C / 12g F — ~380 kcal" },
      { time: "Meal 2 — Lunch (12:00 PM)", foods: "180g chicken breast grilled | Large mixed greens salad with cucumber, bell pepper, lemon juice | 150g sweet potato", macros: "~45g P / 35g C / 5g F — ~370 kcal" },
      { time: "Meal 3 — Pre-Workout (3:30 PM)", foods: "1 scoop whey isolate + 1 medium apple", macros: "~25g P / 25g C / 1g F — ~210 kcal" },
      { time: "Meal 4 — Post-Workout Dinner (6:30 PM)", foods: "200g white fish (cod) baked with lemon + 200g steamed broccoli + 50g brown rice", macros: "~42g P / 25g C / 3g F — ~300 kcal" },
      { time: "Meal 5 — Evening (8:30 PM)", foods: "250g cottage cheese low-fat + 10g chia seeds + cinnamon", macros: "~30g P / 10g C / 5g F — ~210 kcal" },
    ]},
    { label: "Sample Day B (Rest Day — Lower Carb)", meals: [
      { time: "Meal 1 — Breakfast (8:00 AM)", foods: "250g Greek yogurt 0% + 100g berries + 20g almonds | Green tea", macros: "~28g P / 18g C / 12g F — ~290 kcal" },
      { time: "Meal 2 — Lunch (12:30 PM)", foods: "180g tuna in water + large spinach salad with cucumber, tomato, 1 tbsp olive oil + lemon | Sparkling water", macros: "~40g P / 8g C / 15g F — ~330 kcal" },
      { time: "Meal 3 — Afternoon (3:30 PM)", foods: "2 hard-boiled eggs + celery sticks + 1 tbsp almond butter", macros: "~16g P / 5g C / 16g F — ~230 kcal" },
      { time: "Meal 4 — Dinner (6:30 PM)", foods: "140g lean steak grilled + 200g roasted cauliflower + 200g zucchini sauteed in cooking spray", macros: "~38g P / 12g C / 10g F — ~290 kcal" },
      { time: "Meal 5 — Evening (8:30 PM)", foods: "1 scoop casein protein + 200ml unsweetened almond milk", macros: "~25g P / 3g C / 2g F — ~130 kcal" },
    ]},
  ],
  endurance_carb: [
    { label: "Sample Day A (Long Session Day)", meals: [
      { time: "Meal 1 — Pre-Session Breakfast (6:00 AM)", foods: "100g oats + 1 banana + 1 tbsp honey + 250g Greek yogurt | Coffee", macros: "~25g P / 85g C / 8g F — ~510 kcal" },
      { time: "Meal 2 — Post-Session Recovery (9:30 AM)", foods: "1 scoop whey protein + 2 slices whole-grain bread with honey + 1 banana + 200ml orange juice", macros: "~30g P / 80g C / 5g F — ~490 kcal" },
      { time: "Meal 3 — Lunch (1:00 PM)", foods: "150g chicken breast + 100g whole-wheat pasta with tomato sauce + steamed vegetables (200g)", macros: "~45g P / 65g C / 10g F — ~530 kcal" },
      { time: "Meal 4 — Afternoon (4:00 PM)", foods: "250g sweet potato baked + 28g almonds + 1 apple", macros: "~8g P / 55g C / 14g F — ~370 kcal" },
      { time: "Meal 5 — Dinner (7:00 PM)", foods: "150g white fish + 100g brown rice + 150g beet salad with olive oil + mixed greens", macros: "~38g P / 50g C / 12g F — ~460 kcal" },
    ]},
    { label: "Sample Day B (Easy / Recovery Day)", meals: [
      { time: "Meal 1 — Breakfast (8:00 AM)", foods: "3 whole eggs + 2 slices whole-grain toast + 1/2 avocado + fruit (200g)", macros: "~25g P / 45g C / 22g F — ~470 kcal" },
      { time: "Meal 2 — Lunch (12:30 PM)", foods: "200g lentil soup + whole-grain roll + side salad with olive oil", macros: "~20g P / 50g C / 12g F — ~390 kcal" },
      { time: "Meal 3 — Afternoon Snack (3:30 PM)", foods: "250g Greek yogurt + 4-5 dates + 2 tbsp nut butter", macros: "~25g P / 40g C / 16g F — ~400 kcal" },
      { time: "Meal 4 — Dinner (7:00 PM)", foods: "140g lean beef + 200g sweet potato + steamed broccoli and carrots (200g)", macros: "~38g P / 45g C / 14g F — ~460 kcal" },
    ]},
  ],
  mediterranean: [
    { label: "Sample Day A", meals: [
      { time: "Meal 1 — Breakfast (7:30 AM)", foods: "3 eggs scrambled in 1 tbsp extra virgin olive oil + tomatoes, spinach, and feta (50g) | 1 slice whole-grain bread | Fresh fruit (150g)", macros: "~28g P / 30g C / 22g F — ~430 kcal" },
      { time: "Meal 2 — Lunch (12:30 PM)", foods: "160g grilled salmon + 60g bulgur cooked + large Greek salad (cucumber, tomato, olives 50g, red onion, olive oil dressing)", macros: "~40g P / 35g C / 24g F — ~520 kcal" },
      { time: "Meal 3 — Afternoon (3:30 PM)", foods: "200g hummus with carrot and cucumber sticks + 28g walnuts", macros: "~15g P / 20g C / 22g F — ~340 kcal" },
      { time: "Meal 4 — Dinner (7:00 PM)", foods: "200g chickpea stew with tomato, eggplant, and herbs | 60g farro cooked | Side of mixed leafy greens with lemon and olive oil", macros: "~20g P / 50g C / 14g F — ~410 kcal" },
      { time: "Meal 5 — Evening (9:00 PM)", foods: "250g Greek yogurt + 1 tbsp honey + 28g almonds", macros: "~22g P / 22g C / 16g F — ~320 kcal" },
    ]},
    { label: "Sample Day B", meals: [
      { time: "Meal 1 — Breakfast (8:00 AM)", foods: "60g oats cooked in water + 250g Greek yogurt + fresh fruit (200g) + 1 tbsp tahini drizzle", macros: "~25g P / 50g C / 12g F — ~410 kcal" },
      { time: "Meal 2 — Lunch (12:30 PM)", foods: "180g sardines or mackerel grilled + 200g sweet potato + 200g roasted vegetables (bell pepper, zucchini, eggplant) with 2 tbsp olive oil", macros: "~38g P / 40g C / 26g F — ~550 kcal" },
      { time: "Meal 3 — Afternoon (3:30 PM)", foods: "Handful of olives (50g) + 50g feta + 1 whole-grain pita", macros: "~10g P / 20g C / 18g F — ~280 kcal" },
      { time: "Meal 4 — Dinner (7:00 PM)", foods: "200g lentil + vegetable stew (tomato, carrot, celery base) | 60g whole-wheat pasta | Side greens with lemon", macros: "~22g P / 55g C / 8g F — ~380 kcal" },
      { time: "Meal 5 — Evening (9:00 PM)", foods: "Fresh fruit (150g) + 28g dark chocolate (70%+)", macros: "~3g P / 30g C / 10g F — ~220 kcal" },
    ]},
  ],
}

// ─── WEEKLY CHECK-IN QUESTIONS ───────────────────────────────────────────────

const WEEKLY_CHECKIN_QUESTIONS = [
  "Rate your energy levels this week (1-10). Has energy improved, declined, or stayed the same versus last week?",
  "How many of your scheduled training sessions did you complete this week? If you missed any, what prevented you?",
  "Rate your sleep quality this week (1-10). Are you getting 7-9 hours consistently?",
  "Did you hit your calorie and protein targets on most days (at least 5 of 7)? If not, where did you fall short?",
  "Rate your muscle soreness and joint comfort (1-10, where 10 = pain-free). Any nagging aches that need attention?",
  "What was your biggest win this week — a new PR, a habit locked in, a better food choice, or simply showing up?",
  "On a scale of 1-10, how motivated do you feel heading into next week? What would boost it by 1 point?",
  "Are you drinking enough water? Track one day this week — aim for at least 3 litres.",
  "Did you take at least 1 full rest day? How did you spend it (walks, stretching, full rest)?",
  "Is there anything in the plan that feels too hard, too easy, or needs adjusting for next week?",
]

// ─── FORM GUIDES ─────────────────────────────────────────────────────────────

interface FormGuide { setup: string; execution: string; common_mistakes: string; breathing: string }

const FORM_GUIDES: Record<string, FormGuide> = {
  "Barbell Bench Press": {
    setup: "Lie flat on the bench with eyes directly under the bar. Feet flat on the floor, shoulder blades retracted and depressed (pinch them together and push them down into the bench). Grip the bar slightly wider than shoulder-width.",
    execution: "Unrack the bar with arms locked. Lower the bar to your mid-chest (roughly nipple line) with controlled speed — about 2 seconds down. Touch the chest lightly without bouncing. Press the bar up and slightly back toward your face, locking out at the top.",
    common_mistakes: "Flaring elbows to 90 degrees (tuck to ~45-75 degrees instead), bouncing the bar off the chest, lifting hips off the bench, not using a full range of motion, gripping too narrow or too wide.",
    breathing: "Inhale at the top before lowering. Hold the breath during the descent and initial press. Exhale through the sticking point or at lockout.",
  },
  "Back Squat": {
    setup: "Bar across upper traps (high bar) or rear delts (low bar). Hands grip the bar as narrow as shoulder mobility allows. Feet shoulder-width or slightly wider, toes pointed out 15-30 degrees. Brace your core by taking a deep belly breath and pushing your abs outward.",
    execution: "Initiate by pushing hips back and bending knees simultaneously. Descend until the hip crease passes below the top of the knee (at least parallel). Drive up by pushing the floor away with your whole foot — keep the bar path vertical. Lockout hips and knees at the top.",
    common_mistakes: "Knees caving inward (push them over toes), excessive forward lean (keep chest up), cutting depth short, relaxing the brace at the bottom, heels lifting off the floor.",
    breathing: "Big breath at the top, brace hard, descend. Hold the breath until past the sticking point on the way up. Exhale at the top. Reset breath each rep.",
  },
  "Deadlift": {
    setup: "Stand with feet hip-width apart, bar over mid-foot. Bend down and grip the bar just outside your shins — double overhand or mixed grip. Hips higher than knees, shoulders over or slightly in front of the bar. Lats engaged (imagine putting them in your back pockets). Spine neutral from head to tailbone.",
    execution: "Push the floor away with your legs while keeping the bar tight to your body. The bar should travel in a straight vertical line. Once the bar passes the knees, drive hips forward to lockout. Stand tall with shoulders back — do not hyperextend. Lower in reverse: hinge hips back first, then bend knees once the bar passes them.",
    common_mistakes: "Rounding the lower back, bar drifting away from the body, jerking the bar off the floor (take the slack out first), hyperextending at lockout, looking up excessively (neutral neck).",
    breathing: "Breath and brace before pulling. Hold throughout the rep. Exhale at the top. Reset completely between reps (dead stop — it's called a deadlift for a reason).",
  },
  "Overhead Barbell Press": {
    setup: "Bar racked at collarbone height. Grip slightly outside shoulder-width. Elbows in front of the bar (not flared out). Feet hip-width, glutes and core braced. Chin slightly tucked to clear the bar path.",
    execution: "Press the bar straight up, moving your head slightly back to let the bar travel in a straight line. As the bar passes your forehead, push your head through (forward) so the bar finishes directly over mid-foot. Lock out completely with biceps near ears.",
    common_mistakes: "Excessive back arch (squeeze glutes to prevent it), pressing the bar forward instead of straight up, not locking out fully, using leg drive unintentionally (that turns it into a push press).",
    breathing: "Breath and brace before pressing. Exhale at the top. Inhale as you lower the bar back to the collarbone.",
  },
  "Pull-Ups": {
    setup: "Hang from the bar with hands slightly outside shoulder-width, palms facing away (overhand). Start from a dead hang with arms fully extended. Retract and depress shoulder blades before pulling.",
    execution: "Pull your chest toward the bar by driving elbows down and back. Chin must clear the bar at the top. Lower with control — full extension at the bottom (dead hang) before the next rep. Do not swing or kip unless specifically doing kipping pull-ups.",
    common_mistakes: "Half reps (not going to full extension at the bottom), excessive kipping or swinging, not getting chin over the bar, gripping too wide, rushing the eccentric (lower slowly for more gains).",
    breathing: "Exhale as you pull up. Inhale as you lower. If the set is heavy, brace at the bottom and exhale at the top.",
  },
  "Romanian Deadlift": {
    setup: "Hold the bar with a double overhand grip at hip height. Feet hip-width apart. Slight bend in the knees (5-15 degrees) — this stays constant throughout. Shoulder blades retracted.",
    execution: "Push your hips straight back as if trying to touch the wall behind you. The bar slides down the front of your thighs and shins, staying in contact with your legs. Lower until you feel a deep stretch in the hamstrings (typically mid-shin to just below the knee). Drive hips forward to return to standing — squeeze glutes at the top.",
    common_mistakes: "Bending the knees too much (this becomes a conventional deadlift), rounding the lower back, letting the bar drift away from the legs, not hinging deep enough, hyperextending at the top.",
    breathing: "Inhale as you hinge down. Exhale as you drive hips forward to stand.",
  },
  "Hip Thrust": {
    setup: "Upper back on a bench, feet flat on the floor shoulder-width apart, knees at about 90 degrees at the top. Bar padded across the hip crease. Tuck chin slightly — look forward, not at the ceiling.",
    execution: "Drive through your heels, pushing hips up until your torso is parallel to the floor. Squeeze glutes hard at the top for a full second. Lower with control — do not bounce at the bottom.",
    common_mistakes: "Hyperextending the lower back instead of squeezing glutes, feet too far forward (hamstrings dominate) or too close (quads dominate), not using a full range of motion, looking up which extends the spine.",
    breathing: "Exhale forcefully at the top during the glute squeeze. Inhale as you lower.",
  },
}

// ─── PROGRESSION NOTES ───────────────────────────────────────────────────────

const PROGRESSION_NOTES: Record<string, { early: string; mid: string; late: string }> = {
  linear: {
    early: "Weeks 1-4: Focus on learning and perfecting exercise form. Use moderate loads that leave 3-4 reps in reserve (RPE 6-7). Record your starting weights — these are your baseline. Do not rush progression; build the habit of consistent attendance and good form first.",
    mid: "Weeks 5-12: Add 2.5-5% load per week to compound lifts (squat, bench, deadlift, press) when you successfully complete all prescribed sets and reps. For isolation exercises, add weight every 2 weeks or increase reps first. If you miss reps on two consecutive sessions, hold the weight for one more week.",
    late: "Weeks 13+: Test your strength on key lifts. Attempt conservative personal records (add 2.5 kg to upper body lifts, 5 kg to lower body). After testing, deload for 1 week at 60-70% of your working loads, then begin the next progression cycle. Review your training log to identify lifts that stalled — these may need technique refinement or a different rep range.",
  },
  wave: {
    early: "Accumulation weeks (Week 1 of each wave): Higher reps, moderate weight. RPE 6-7 — you should finish each set feeling like you had 3+ reps left. The goal is volume and movement quality, not maximal effort.",
    mid: "Intensification weeks (Week 2-3 of each wave): Increase weight 5-8% from accumulation week. Reps drop slightly. RPE 7.5-8.5 — sets should feel challenging but completable. This is where strength adaptations happen.",
    late: "Deload weeks (Week 4 of each wave): Drop to 60-70% of your heaviest loads. Same exercises, same sets, but fewer reps and much lighter weight. This week is not wasted — it lets your tendons, joints, and nervous system recover so the next wave starts fresh.",
  },
  block: {
    early: "Hypertrophy blocks (first 4-week cycle): 8-12 reps on compounds, 12-15 on isolations. Weight should challenge you in the last 2-3 reps of each set (RPE 7-8). Focus on controlled eccentrics (3-second lowering). Total weekly volume per muscle group: 12-20 sets.",
    mid: "Strength blocks (second 4-week cycle): 4-6 reps on compounds, 6-8 on accessories. Heavier loads, longer rest periods (2-3 min between compound sets). RPE 8-9 — the last rep should be genuinely hard. Reduce total weekly volume by 20-30% compared to hypertrophy block.",
    late: "Peaking blocks (third 4-week cycle): 1-3 reps on key lifts, working up to heavy singles or doubles. Full recovery between sets (3-5 min). Test your maxes in the final week. After peaking, reset to a hypertrophy block at slightly higher baseline loads than the previous cycle.",
  },
}

// ─── REGION FOOD TIPS ────────────────────────────────────────────────────────

const REGION_FOOD_TIPS: Record<string, string> = {
  north_america: "Good local protein sources: chicken, turkey, beef, eggs, Greek yogurt, whey. Carb staples: oats, sweet potato, brown rice, whole-grain bread. Widely available year-round.",
  europe: "Great local options: salmon (Nordic), Greek yogurt, eggs, lentils, whole-grain rye bread, olive oil (Mediterranean). Seasonal vegetables from local markets are ideal.",
  west_africa: "Excellent local proteins: grilled chicken, fish (tilapia, mackerel), black-eyed peas, groundnuts. Carb staples: plantain, yam, cassava, millet, brown rice. Cook with palm oil or groundnut oil in moderation.",
  east_africa: "Great local proteins: lentils (misir), chickpeas, tilapia, eggs, goat meat. Carb staples: injera (teff), ugali, sweet potato, sorghum. Ethiopian and Kenyan staples are naturally nutrient-dense.",
  south_asia: "Rich local proteins: lentils (dal), paneer, chickpeas, eggs, yogurt (dahi), chicken. Carb staples: basmati rice, roti (whole wheat), oats. Season with turmeric, cumin, and ginger for anti-inflammatory benefits.",
  east_asia: "Good local proteins: tofu, tempeh, fish, eggs, chicken, edamame. Carb staples: white or brown rice, sweet potato, noodles (soba). Fermented foods (kimchi, miso) support gut health.",
  latin_america: "Excellent local proteins: black beans, chicken, eggs, fish, queso fresco. Carb staples: rice, corn tortillas, plantain, quinoa, sweet potato. Avocado is a great fat source year-round.",
  middle_east: "Great local proteins: chickpeas (hummus), lentils, yogurt (labneh), chicken, lamb, eggs. Carb staples: pita bread, bulgur, freekeh, rice. Use olive oil and tahini as healthy fat sources.",
  caribbean: "Good local proteins: fish (snapper, mahi-mahi), chicken, black beans, pigeon peas, eggs. Carb staples: rice, plantain, breadfruit, cassava, sweet potato. Season with scotch bonnet, thyme, and allspice.",
}

// ─── ALLERGEN FILTER ─────────────────────────────────────────────────────────

const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  nuts: ["almond", "walnut", "cashew", "peanut", "nut butter", "peanut butter"],
  dairy: ["milk", "yogurt", "cheese", "cottage", "whey", "casein", "butter", "feta"],
  gluten: ["bread", "pasta", "oats", "bagel", "tortilla", "wheat", "farro", "bulgur"],
  shellfish: ["shrimp", "crab", "lobster", "shellfish"],
  eggs: ["egg"],
  soy: ["tofu", "tempeh", "soy", "edamame"],
}

function filterAllergens(foodList: string[], allergies: string[]): string[] {
  if (!allergies.length) return [...foodList]
  const blocked = new Set<string>()
  for (const allergy of allergies) {
    for (const kw of (ALLERGEN_KEYWORDS[allergy] ?? [allergy])) {
      blocked.add(kw.toLowerCase())
    }
  }
  const filtered = foodList.filter(food => {
    const lower = food.toLowerCase()
    return ![...blocked].some(kw => lower.includes(kw))
  })
  return filtered.length ? filtered : ["Consult a dietitian for safe alternatives suited to your allergies"]
}

// ─── FOCUS LABEL ─────────────────────────────────────────────────────────────

const FOCUS_LABELS: Record<string, string> = {
  push_compound: "Push (Chest / Shoulders / Triceps)",
  pull_compound: "Pull (Back / Biceps)",
  leg_compound: "Legs (Quads / Hamstrings / Glutes)",
  core: "Core",
  cardio_steady: "Steady-State Cardio",
  cardio_hiit: "HIIT / Conditioning",
  mobility: "Mobility & Active Recovery",
  arms_isolation: "Arms (Biceps + Triceps)",
  shoulders_isolation: "Shoulders (Delts)",
  calves: "Calves",
}

function focusLabel(primary: string, secondary: string[]): string {
  const base = FOCUS_LABELS[primary] ?? primary
  if (secondary.length) {
    return base + " + " + secondary.map(s => FOCUS_LABELS[s] ?? s).join(", ")
  }
  return base
}

// ─── WARMUP SELECTOR ─────────────────────────────────────────────────────────

function getWarmup(categories: string[]): WarmupProtocol {
  const hasLegs = categories.some(c => c === "leg_compound" || c === "calves")
  const hasUpper = categories.some(c => ["push_compound", "pull_compound", "arms_isolation", "shoulders_isolation"].includes(c))
  const hasCardio = categories.some(c => c.startsWith("cardio"))
  const isMobility = categories.length === 1 && categories[0] === "mobility"

  if (isMobility) return WARMUP_PROTOCOLS.mobility
  if (hasCardio && !hasLegs && !hasUpper) return WARMUP_PROTOCOLS.cardio
  if (hasLegs && hasUpper) return WARMUP_PROTOCOLS.full_body
  if (hasLegs) return WARMUP_PROTOCOLS.lower_body
  if (hasUpper) return WARMUP_PROTOCOLS.upper_body
  return WARMUP_PROTOCOLS.full_body
}

// ─── SETS/REPS SCALING ──────────────────────────────────────────────────────

function scaleSetsReps(scheme: string, weekNumber: number, curve: string): string {
  if (curve === "linear") {
    if (weekNumber <= 4) return `${scheme} — establish form`
    if (weekNumber <= 8) return `${scheme} — add 2.5-5% load over week 4`
    if (weekNumber <= 12) return `${scheme} — push for PRs on top sets`
    if (weekNumber <= 16) return `${scheme} — deload load by 10%, refocus form`
    if (weekNumber <= 20) return `${scheme} — re-approach top loads`
    return `${scheme} — test week, plan PR attempts`
  }
  if (curve === "wave") {
    const mod = (weekNumber - 1) % 4
    if (mod === 0) return `${scheme} — accumulation, manageable load`
    if (mod === 1) return `${scheme} — intensification, +5%`
    if (mod === 2) return `${scheme} — peak, +5% again`
    return `${scheme} — DELOAD, drop load 20%`
  }
  // block
  const mod = (weekNumber - 1) % 4
  const blockIdx = Math.floor((weekNumber - 1) / 4)
  const blockName = ["Hypertrophy", "Strength", "Peaking"][blockIdx % 3]
  if (mod === 3) return `${scheme} — DELOAD (${blockName} block close)`
  return `${scheme} — ${blockName} focus`
}

// ─── MEAL TIMING ─────────────────────────────────────────────────────────────

function mealTimingForGoal(goal: string): string[] {
  if (goal === "lose_weight") return [
    "3 main meals plus 1 protein-rich snack — total 4 eating windows",
    "Highest-carb meal at the meal closest to your training session",
    "Stop eating 2-3 hours before sleep to support recovery and sleep quality",
    "Protein in every meal — keeps satiety up during a deficit",
  ]
  if (goal === "gain_weight" || goal === "build_muscle") return [
    "5-6 meals per day spaced 3 hours apart — bulk requires consistent intake",
    "Largest carb meal in the 2-3 hours after training",
    "Casein-rich meal (Greek yogurt or cottage cheese) before sleep",
    "Protein every meal — 30-45g per meal target",
  ]
  if (goal === "improve_endurance") return [
    "Carb-rich meal 2-3 hours before long sessions",
    "Carb refuel within 30-60 minutes after long sessions",
    "Hydrate consistently throughout the day — not just around sessions",
    "Protein with every main meal for repair without dominating macros",
  ]
  return [
    "3 balanced meals plus 1-2 small snacks if hungry",
    "Largest meal mid-day — supports steady afternoon energy",
    "Light dinner 2-3 hours before bed",
    "Protein in every meal for satiety and recovery",
  ]
}

// ─── BUILD HELPERS ───────────────────────────────────────────────────────────

function buildWeekDays(splitDef: TrainingSplit, level: string, weekNumber: number, curve: string) {
  const days = []
  for (const { day: dayLabel, categories } of splitDef.schedule) {
    if (!categories.length) {
      days.push({ day: dayLabel, focus: "Rest", warmup: null, exercises: [], estimated_duration: "Rest day — active recovery only" })
      continue
    }

    const primary = categories[0]
    const secondary = categories.slice(1)
    const focus = focusLabel(primary, secondary)
    const warmup = getWarmup(categories)
    const exercises: Record<string, unknown>[] = []

    for (const cat of categories) {
      const pool = EXERCISE_LIBRARY[cat]
      if (!pool) continue
      let pickCount = ["push_compound", "pull_compound", "leg_compound"].includes(cat) ? 3 : 2
      pickCount = Math.min(pickCount, pool.length)
      const start = (weekNumber - 1) % pool.length
      for (let i = 0; i < pickCount; i++) {
        const ex = pool[(start + i) % pool.length]
        const setsReps = level === "beginner" ? ex.beginner : level === "intermediate" ? ex.intermediate : ex.advanced
        exercises.push({
          name: ex.name,
          scheme: scaleSetsReps(setsReps, weekNumber, curve),
          rest: ex.rest > 0 ? `${ex.rest} seconds` : "no rest",
          muscles: ex.muscles,
          notes: ex.notes,
        })
      }
    }

    const estMinutes = exercises.length * 5 + 10
    days.push({
      day: dayLabel,
      focus,
      warmup,
      exercises,
      estimated_duration: `~${estMinutes}-${estMinutes + 15} minutes including warm-up and cool-down`,
    })
  }
  return days
}

function buildNutrition(recipe: Recipe, goal: string, profile: Profile) {
  const diet = MEAL_LIBRARY[recipe.diet_style]
  const kcal = recipe.calorie_target
  const ratio = recipe.macro_ratio
  const proteinG = Math.floor((kcal * ratio.protein) / 4)
  const carbsG = Math.floor((kcal * ratio.carbs) / 4)
  const fatsG = Math.floor((kcal * ratio.fats) / 9)

  const allergies = (profile.allergies ?? "").split(",").map(a => a.trim().toLowerCase()).filter(Boolean)
  const preferred = (profile.preferred_proteins ?? "").split(",").map(p => p.trim().toLowerCase()).filter(Boolean)
  const region = profile.region ?? ""

  const proteinsList = filterAllergens(diet.proteins, allergies)
  const carbsList = filterAllergens(diet.carbs, allergies)
  const fatsList = filterAllergens(diet.fats, allergies)
  const vegsList = filterAllergens(diet.vegetables, allergies)

  const avoidList = [...diet.avoid]
  if (allergies.length) avoidList.push(`All foods containing: ${allergies.join(", ")}`)

  const dietaryNotes: string[] = []
  if (preferred.length) {
    dietaryNotes.push(`Prioritise these proteins in your meals: ${preferred.map(p => p.replace(/_/g, " ")).join(", ")}`)
  }
  if (region) {
    const tips = REGION_FOOD_TIPS[region]
    if (tips) dietaryNotes.push(tips)
  }

  const result: Record<string, unknown> = {
    diet_style: diet.label,
    daily_calories: kcal,
    protein_g: proteinG,
    carbs_g: carbsG,
    fats_g: fatsG,
    macro_ratio: ratio,
    proteins: proteinsList,
    carbs: carbsList,
    fats: fatsList,
    vegetables: vegsList,
    hydration: diet.hydration,
    foods_to_avoid: avoidList,
    meal_timing: mealTimingForGoal(goal),
  }
  if (dietaryNotes.length) result.dietary_notes = dietaryNotes
  return result
}

function buildSampleMeals(dietStyle: string, profile: Profile) {
  const plans = SAMPLE_MEAL_PLANS[dietStyle] ?? SAMPLE_MEAL_PLANS.high_protein_balanced
  const allergies = (profile.allergies ?? "").split(",").map(a => a.trim().toLowerCase()).filter(Boolean)
  if (!allergies.length) return plans
  const note = `Review these sample meals and substitute any items containing: ${allergies.join(", ")}. Your nutrition guidelines above list safe alternatives.`
  return [{ allergy_notice: note }, ...plans]
}

function buildMilestones(goal: string, weeks: number) {
  const pool = MILESTONES_BY_GOAL[goal] ?? MILESTONES_BY_GOAL.general_wellness
  const count = Math.min(pool.length, Math.max(4, Math.floor(weeks / 2)))
  const step = Math.max(1, Math.floor(weeks / count))
  const milestones = []
  for (let i = 0; i < count; i++) {
    milestones.push({
      week: Math.min(weeks, (i + 1) * step),
      title: `Milestone ${i + 1}`,
      description: pool[i % pool.length],
    })
  }
  return milestones
}

function buildRecovery(priority: string): string[] {
  if (priority === "high") return RECOVERY_GUIDANCE_HIGH
  if (priority === "moderate") return RECOVERY_GUIDANCE_MODERATE
  return RECOVERY_GUIDANCE_LOW
}

function buildMotivation(weeks: number): string[] {
  const count = Math.min(MOTIVATION_TIPS.length, Math.max(6, Math.floor(weeks / 3)))
  return MOTIVATION_TIPS.slice(0, count)
}

function buildSupplements(goal: string): Supplement[] {
  return SUPPLEMENT_RECS[goal] ?? SUPPLEMENT_RECS.general_wellness
}

function buildProgressionGuide(curve: string) {
  const notes = PROGRESSION_NOTES[curve] ?? PROGRESSION_NOTES.linear
  const curveInfo = INTENSITY_CURVES[curve]
  return {
    curve_name: curveInfo.label,
    curve_description: curveInfo.description,
    early_phase: notes.early,
    mid_phase: notes.mid,
    late_phase: notes.late,
  }
}

function buildFormGuides(splitDef: TrainingSplit) {
  const exercisesInPlan = new Set<string>()
  for (const { categories } of splitDef.schedule) {
    for (const cat of categories) {
      const pool = EXERCISE_LIBRARY[cat]
      if (pool) pool.forEach(ex => exercisesInPlan.add(ex.name))
    }
  }
  const guides = []
  for (const [name, guide] of Object.entries(FORM_GUIDES)) {
    if (exercisesInPlan.has(name)) {
      guides.push({ exercise: name, ...guide })
    }
  }
  return guides
}

function buildWeeklyCheckin(_weeks: number) {
  return {
    frequency: "Complete these questions at the end of each training week (e.g., Sunday evening)",
    purpose: "Tracking these metrics weekly lets you spot trends — a dip in sleep or energy predicts a bad training week before it happens. Adjust proactively rather than reactively.",
    questions: WEEKLY_CHECKIN_QUESTIONS,
  }
}

function buildSummary(profile: Profile, recipe: Recipe, durationMonths: number, weeks: number): string {
  const goals = profile.goal_type.split(",").map(g => g.trim())
  const goalLabels = goals.map(g => g.replace(/_/g, " ")).join(" & ")
  const splitLabel = TRAINING_SPLITS[recipe.training_split].label
  const dietLabel = MEAL_LIBRARY[recipe.diet_style].label
  return (
    `This is a ${durationMonths}-month (${weeks}-week) ` +
    `${splitLabel.toLowerCase()} program for a ` +
    `${profile.fitness_level} client focused on: ` +
    `${goalLabels}. Nutrition follows the ${dietLabel} template at ` +
    `${recipe.calorie_target} kcal/day with macros split ` +
    `${Math.floor(recipe.macro_ratio.protein * 100)}/` +
    `${Math.floor(recipe.macro_ratio.carbs * 100)}/` +
    `${Math.floor(recipe.macro_ratio.fats * 100)} P/C/F. ` +
    `Recovery priority: ${recipe.recovery_priority}. ` +
    `Personalisation: ${recipe.personalization_notes}`
  )
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export function expandPlan(profile: Profile, durationMonths: number, recipe: Recipe): Record<string, unknown> {
  const weeks = durationMonths * 4
  const level = profile.fitness_level
  const goals = profile.goal_type.split(",").map(g => g.trim())
  const goal = goals[0]

  const splitDef = TRAINING_SPLITS[recipe.training_split]
  if (!splitDef) throw new Error(`Unknown training split: ${recipe.training_split}`)

  const curve = recipe.intensity_curve
  const themesPool = curve === "linear" ? LINEAR_THEMES : curve === "wave" ? WAVE_THEMES : BLOCK_THEMES

  const weeklySchedule = []
  for (let w = 0; w < weeks; w++) {
    weeklySchedule.push({
      week_number: w + 1,
      theme: themesPool[w % themesPool.length],
      schedule: buildWeekDays(splitDef, level, w + 1, curve),
    })
  }

  return {
    summary: buildSummary(profile, recipe, durationMonths, weeks),
    training_split_label: splitDef.label,
    intensity_curve: INTENSITY_CURVES[curve],
    progression_guide: buildProgressionGuide(curve),
    weekly_schedule: weeklySchedule,
    nutrition_guidelines: buildNutrition(recipe, goal, profile),
    sample_daily_meal_plans: buildSampleMeals(recipe.diet_style, profile),
    supplement_recommendations: buildSupplements(goal),
    milestones: buildMilestones(goal, weeks),
    recovery_guidance: buildRecovery(recipe.recovery_priority),
    motivation_tips: buildMotivation(weeks),
    exercise_form_guides: buildFormGuides(splitDef),
    weekly_checkin_questions: buildWeeklyCheckin(weeks),
    cooldown_protocol: COOLDOWN_PROTOCOL,
  }
}

export function sanitiseRecipe(raw: Record<string, unknown>, profile: Profile): Recipe {
  const goals = profile.goal_type.split(",").map(g => g.trim())
  const goal = goals[0]
  const level = profile.fitness_level

  let split = raw.training_split as string
  if (!TRAINING_SPLITS[split]) {
    split = level === "beginner" ? "full_body_3d" : level === "intermediate" ? "upper_lower_4d" : "push_pull_legs_5d"
  }

  let curve = raw.intensity_curve as string
  if (!INTENSITY_CURVES[curve]) {
    curve = level === "beginner" ? "linear" : level === "intermediate" ? "wave" : "block"
  }

  let dietStyle = raw.diet_style as string
  if (!MEAL_LIBRARY[dietStyle]) {
    dietStyle = GOAL_DIET_DEFAULTS[goal] ?? "high_protein_balanced"
  }

  let recoveryPriority = raw.recovery_priority as string
  if (!["high", "moderate", "low"].includes(recoveryPriority)) {
    recoveryPriority = "moderate"
  }

  let calorieTarget = Number(raw.calorie_target) || 0
  if (calorieTarget < 1200 || calorieTarget > 4500) {
    calorieTarget = GOAL_CALORIE_DEFAULTS[goal] ?? 2200
  }

  const macroRaw = (raw.macro_ratio ?? {}) as Record<string, unknown>
  let p = Number(macroRaw.protein) || 0
  let c = Number(macroRaw.carbs) || 0
  let f = Number(macroRaw.fats) || 0
  const total = p + c + f
  if (total < 0.95 || total > 1.05 || Math.min(p, c, f) <= 0) {
    const defaults = GOAL_MACRO_DEFAULTS[goal] ?? GOAL_MACRO_DEFAULTS.general_wellness
    p = defaults.protein; c = defaults.carbs; f = defaults.fats
  }

  let cardioMinutes = Number(raw.cardio_minutes_per_week) || 0
  if (cardioMinutes < 0 || cardioMinutes > 360) {
    cardioMinutes = goal === "lose_weight" ? 120 : 90
  }

  let notes = raw.personalization_notes as string
  if (!notes || typeof notes !== "string") {
    const goalLabels = goals.map(g => g.replace(/_/g, " ")).join(" & ")
    notes = `Tailored for a ${profile.age}-year-old focused on ${goalLabels}.`
  }
  if (notes.length > 240) notes = notes.slice(0, 237) + "..."

  return {
    training_split: split,
    intensity_curve: curve,
    calorie_target: calorieTarget,
    macro_ratio: { protein: Math.round(p * 100) / 100, carbs: Math.round(c * 100) / 100, fats: Math.round(f * 100) / 100 },
    cardio_minutes_per_week: cardioMinutes,
    diet_style: dietStyle,
    recovery_priority: recoveryPriority,
    personalization_notes: notes,
  }
}
