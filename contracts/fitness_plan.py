# v0.3.0 — production-scale FitFam fitness plan contract
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
#
# Design — Option 2: strict comparative EQ on a tightly constrained tiny JSON output.
# Validators only need to agree on a small "recipe" (training split, calorie target,
# macro ratios, diet style, intensity curve, recovery priority, personalization
# notes). The rich, multi-week plan content is then assembled DETERMINISTICALLY from
# Python lookup tables (EXERCISE_LIBRARY, MEAL_LIBRARY, PROGRESSION_RULES, etc.) so
# every validator builds the exact same final plan from the same tiny recipe.
#
# This keeps leader-rotation / undetermined-state risk minimal while still letting
# the LLM do real personalization based on age, weight, height, fitness level, and
# goal type.

import json
from genlayer import *


# ─────────────────────────────────────────────────────────────────────────────
# EXERCISE LIBRARY
# Indexed by movement category. Each entry: (name, beginner_sets_reps,
# intermediate_sets_reps, advanced_sets_reps, rest_seconds, primary_muscles, notes).
# This is what the deterministic expansion draws from once the LLM picks a split.
# ─────────────────────────────────────────────────────────────────────────────

EXERCISE_LIBRARY = {
    "push_compound": [
        ("Barbell Bench Press",       "3x8-10",  "4x6-8",   "5x5",     120, "chest, triceps, front delts", "Keep shoulder blades retracted; bar to mid-chest"),
        ("Incline Dumbbell Press",    "3x10-12", "4x8-10",  "4x6-8",   90,  "upper chest, front delts",    "45-degree bench; pause briefly at the bottom"),
        ("Overhead Barbell Press",    "3x8-10",  "4x6-8",   "5x5",     120, "shoulders, triceps",          "Glutes squeezed; no excessive arch"),
        ("Dumbbell Shoulder Press",   "3x10-12", "4x8-10",  "4x6-8",   90,  "shoulders, triceps",          "Press in slight arc; do not lock out hard"),
        ("Weighted Dips",             "3x6-8",   "4x6-8",   "5x5-8",   120, "chest, triceps",              "Lean forward for chest; vertical for triceps"),
        ("Close-Grip Bench Press",    "3x8-10",  "4x6-8",   "4x5-6",   90,  "triceps, chest",              "Hands shoulder-width; elbows tucked"),
        ("Push-Up",                   "3x10-15", "4x12-20", "4x20+",   60,  "chest, triceps, core",        "Full ROM; pause at chest just above floor"),
        ("Floor Press",               "3x8-10",  "4x6-8",   "4x5-6",   90,  "chest, triceps",              "Great for elbow-friendly pressing"),
    ],
    "pull_compound": [
        ("Pull-Ups",                  "3xAMRAP", "4x6-10",  "5x6-10",  120, "lats, biceps, mid-back",      "Use band assistance if needed; full hang to chin over bar"),
        ("Bent-Over Barbell Row",     "3x8-10",  "4x6-8",   "5x5",     120, "lats, mid-back, biceps",      "Hinge to 45 degrees; pull to lower ribs"),
        ("One-Arm Dumbbell Row",      "3x10-12", "4x8-10",  "4x6-8",   90,  "lats, mid-back",              "Hand on bench; pull elbow past torso"),
        ("Seated Cable Row",          "3x10-12", "4x8-10",  "4x6-8",   90,  "mid-back, lats, biceps",      "Squeeze shoulder blades; control eccentric"),
        ("Lat Pulldown",              "3x10-12", "4x8-10",  "4x6-8",   90,  "lats, biceps",                "Slight back lean; pull to upper chest"),
        ("T-Bar Row",                 "3x8-10",  "4x6-8",   "4x6",     120, "mid-back, lats",              "Chest supported version is safer for back"),
        ("Inverted Row",              "3x10-12", "3x12-15", "4x12-15", 60,  "mid-back, lats, biceps",      "Bodyweight; adjust difficulty by foot position"),
        ("Face Pull",                 "3x12-15", "3x15-20", "4x15-20", 60,  "rear delts, mid-back",        "External rotation at end; great for posture"),
    ],
    "leg_compound": [
        ("Back Squat",                "3x8-10",  "4x6-8",   "5x5",     150, "quads, glutes, hamstrings",   "Hip crease below knee; brace core hard"),
        ("Front Squat",               "3x6-8",   "4x5-6",   "5x3-5",   150, "quads, core, upper back",     "Elbows high; bar in front rack"),
        ("Deadlift",                  "3x5-6",   "4x4-5",   "5x3-5",   180, "posterior chain, traps",      "Bar over mid-foot; lats engaged"),
        ("Romanian Deadlift",         "3x8-10",  "4x6-8",   "4x6-8",   120, "hamstrings, glutes",          "Hinge at hip; slight knee bend; bar travels close to leg"),
        ("Bulgarian Split Squat",     "3x10/leg","4x8/leg", "4x6-8/leg", 90, "quads, glutes",              "Rear foot elevated; torso upright"),
        ("Walking Lunges",            "3x12/leg","4x10/leg","4x8/leg", 90,  "quads, glutes, hamstrings",   "Long step; back knee close to ground"),
        ("Hip Thrust",                "3x10-12", "4x8-10",  "4x6-8",   90,  "glutes",                       "Drive heels; full hip lockout at top"),
        ("Leg Press",                 "3x12-15", "4x10-12", "4x8-10",  90,  "quads, glutes",                "Feet shoulder-width; do not lock knees"),
        ("Goblet Squat",              "3x10-12", "3x10-12", "4x10-12", 60,  "quads, core",                  "Elbows brush inside knees at bottom"),
        ("Single-Leg Romanian DL",    "3x8/leg", "3x10/leg","4x10/leg",60,  "hamstrings, glutes, balance",  "Free hand reaches floor; flat back"),
    ],
    "core": [
        ("Plank",                     "3x30s",   "3x45-60s","4x60s+",  45,  "deep core, shoulders",        "Brace as if punched; do not sag hips"),
        ("Hanging Knee Raise",        "3x10-12", "3x12-15", "4x15+",   60,  "lower abs, hip flexors",      "Slow controlled raise; no swing"),
        ("Cable Woodchopper",         "3x12/side","3x12/side","4x12/side",60,"obliques, core",             "Rotate from hips; arms stay straight"),
        ("Ab Wheel Rollout",          "3x6-8",   "3x8-10",  "4x10-12", 90,  "deep core, lats",             "Glutes squeezed; do not arch lower back"),
        ("Russian Twist (weighted)",  "3x20",    "3x24",    "4x30",    45,  "obliques",                    "Feet elevated for harder version"),
        ("Dead Bug",                  "3x10/side","3x12/side","3x15/side",45,"deep core, coordination",    "Lower back glued to floor"),
        ("Hollow Hold",               "3x20-30s","3x30-45s","4x45-60s",45,  "deep core",                    "Lower back flat; shoulders off floor"),
        ("Pallof Press",              "3x10/side","3x12/side","4x12/side",60,"anti-rotation core",         "Press straight out; resist rotation"),
        ("Side Plank",                "3x20-30s/side","3x30-45s/side","4x45s/side",45,"obliques",          "Stack hips; full body straight line"),
    ],
    "cardio_steady": [
        ("Brisk Walking",             "30 min",  "40 min",  "45 min",  0, "cardiovascular, recovery",      "Pace where you can talk but not sing"),
        ("Jogging",                   "20 min",  "30 min",  "40 min",  0, "cardiovascular, legs",          "Nasal breathing if possible — keeps pace honest"),
        ("Cycling (steady)",          "30 min",  "45 min",  "60 min",  0, "cardiovascular, quads",         "Zone 2 — conversational pace"),
        ("Swimming (laps)",           "20 min",  "30 min",  "40 min",  0, "full body cardio",              "Mix freestyle and breaststroke for variety"),
        ("Incline Treadmill Walk",    "25 min",  "35 min",  "45 min",  0, "cardiovascular, glutes",        "5-10% incline; brisk pace"),
        ("Rowing (steady)",           "20 min",  "30 min",  "40 min",  0, "full body cardio",              "Drive legs first, then back, then arms"),
        ("Elliptical",                "25 min",  "35 min",  "45 min",  0, "low-impact cardio",             "Resist holding the rails"),
    ],
    "cardio_hiit": [
        ("Sprint Intervals",          "6 x 30s", "8 x 30s", "10 x 30s",90,"cardiovascular, legs",          "All-out sprint, walk recovery"),
        ("Burpees",                   "4 x 30s", "5 x 40s", "6 x 45s", 60,"full body cardio",              "Crisp form even when fatigued"),
        ("Battle Ropes",              "4 x 30s", "5 x 40s", "6 x 45s", 45,"shoulders, core, cardio",       "Big slams; brace core"),
        ("Kettlebell Swings",         "4 x 20",  "5 x 25",  "6 x 30",  60,"posterior chain, cardio",        "Hip hinge; bell driven by hip snap"),
        ("Jump Rope",                 "5 x 60s", "6 x 90s", "8 x 90s", 45,"calves, cardio, coordination",   "Stay light on toes; quick wrists"),
        ("Box Jumps",                 "4 x 8",   "5 x 8",   "6 x 8",   60,"power, legs",                   "Soft landing; step down, not jump down"),
        ("Mountain Climbers",         "4 x 30s", "5 x 40s", "6 x 45s", 45,"core, cardio",                  "Hips low; drive knees fast"),
    ],
    "mobility": [
        ("World's Greatest Stretch",  "2x5/side","2x6/side","2x6/side",30,"hips, t-spine, hamstrings",     "Hold each position 2-3 seconds"),
        ("Hip 90/90 Switches",        "2x8/side","2x10/side","2x10/side",30,"hips",                       "Stay tall; rotate from hips"),
        ("Cat-Cow",                   "2x10",    "2x12",    "2x12",    30,"spine mobility",                "Full ROM; sync with breath"),
        ("Thoracic Spine Rotation",   "2x8/side","2x10/side","2x10/side",30,"upper back",                 "Side-lying or quadruped position"),
        ("Couch Stretch",             "2x60s/side","2x90s/side","2x90s/side",0,"hip flexors, quads",     "Tuck pelvis; do not over-arch"),
        ("Deep Squat Hold",           "2x30s",   "2x45s",   "2x60s",   30,"hips, ankles",                 "Heels down; elbows push knees out"),
        ("Banded Shoulder Dislocates","2x10",    "2x12",    "2x15",    30,"shoulders",                    "Wide grip; slow controlled arc"),
        ("Pigeon Stretch",            "2x60s/side","2x90s/side","2x90s/side",0,"glutes, hips",          "Square hips; lean forward gently"),
    ],
    "arms_isolation": [
        ("Barbell Curl",              "3x10-12", "3x8-10",  "4x6-8",   60, "biceps",                       "Elbows pinned to ribs; full ROM"),
        ("Hammer Curl",               "3x10-12", "3x10-12", "4x8-10",  60, "biceps, brachialis, forearms", "Neutral grip; do not swing"),
        ("Incline Dumbbell Curl",     "3x10-12", "3x8-10",  "4x8-10",  60, "long head of biceps",          "Full stretch at bottom"),
        ("Triceps Pushdown",          "3x10-12", "3x10-12", "4x8-10",  60, "triceps",                      "Elbows fixed; only forearm moves"),
        ("Overhead Triceps Extension","3x10-12", "3x10-12", "4x10-12", 60, "long head of triceps",         "Full stretch overhead"),
        ("Skull Crusher",             "3x10-12", "3x8-10",  "4x6-8",   90, "triceps",                      "Lower to forehead; do not flare elbows"),
        ("Cable Curl",                "3x12-15", "3x10-12", "4x8-10",  60, "biceps",                       "Constant tension throughout"),
        ("Reverse Curl",              "3x12-15", "3x10-12", "4x10-12", 60, "forearms, brachialis",         "Overhand grip; control eccentric"),
    ],
    "shoulders_isolation": [
        ("Lateral Raise",             "3x12-15", "4x10-12", "4x10-12", 60, "side delts",                   "Slight forward lean; lead with elbow"),
        ("Rear Delt Fly",             "3x12-15", "4x12-15", "4x12-15", 60, "rear delts",                   "Squeeze at top; no momentum"),
        ("Front Raise",               "3x10-12", "3x10-12", "4x10-12", 60, "front delts",                  "Control descent; do not swing"),
        ("Upright Row (light)",       "3x12-15", "3x10-12", "4x10-12", 60, "side delts, traps",            "Use light weight; pain-free ROM only"),
        ("Cable Lateral Raise",       "3x12-15", "3x12-15", "4x10-12", 60, "side delts",                   "Constant tension version of lateral raise"),
    ],
    "calves": [
        ("Standing Calf Raise",       "4x12-15", "4x12-15", "5x10-12", 60, "gastrocnemius",                "Full stretch; pause briefly at top"),
        ("Seated Calf Raise",         "4x15-20", "4x15-20", "5x12-15", 45, "soleus",                       "Knees bent; slow tempo"),
        ("Single-Leg Calf Raise",     "3x12/leg","3x15/leg","4x15/leg",60, "calves, balance",              "Use wall for balance only"),
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# MEAL LIBRARY
# Goal-specific food groupings used to build the daily meal plan deterministically
# once the LLM selects a diet_style. Numbers are servings per day for an
# average adult body weight; multiplied by a scaling factor during expansion.
# ─────────────────────────────────────────────────────────────────────────────

MEAL_LIBRARY = {
    "high_protein_balanced": {
        "label": "High-Protein Balanced",
        "proteins": [
            "Chicken breast (150g)",
            "Lean ground turkey (150g)",
            "White fish — cod or tilapia (180g)",
            "Salmon (140g)",
            "Whole eggs + egg whites (3+4)",
            "Greek yogurt 0% fat (250g)",
            "Cottage cheese 2% (200g)",
            "Lean beef sirloin (140g)",
            "Tofu firm (200g)",
            "Whey protein shake (1 scoop)",
        ],
        "carbs": [
            "Oats (60g dry)",
            "Sweet potato (200g)",
            "Brown rice (60g dry)",
            "Quinoa (60g dry)",
            "Whole-grain bread (2 slices)",
            "Banana (1 medium)",
            "Berries (150g)",
            "Apple (1 large)",
            "Whole-wheat pasta (70g dry)",
        ],
        "fats": [
            "Avocado (1/2 fruit)",
            "Olive oil (1 tbsp)",
            "Almonds (28g)",
            "Walnuts (28g)",
            "Peanut butter natural (2 tbsp)",
            "Chia seeds (15g)",
            "Flaxseed ground (15g)",
        ],
        "vegetables": [
            "Spinach (150g)",
            "Broccoli (200g)",
            "Bell peppers (1 cup)",
            "Carrots (1 cup)",
            "Cucumber (1 cup)",
            "Mixed leafy greens (200g)",
            "Tomatoes (1 cup)",
            "Asparagus (150g)",
            "Cauliflower (200g)",
        ],
        "hydration": "3-4 litres of water daily; black coffee and unsweetened tea allowed",
        "avoid": [
            "Sugary drinks and sodas",
            "Deep-fried foods",
            "Ultra-processed snacks (chips, candy)",
            "Excess refined white bread and pastries",
            "Alcohol (limit to 1-2 drinks per week if at all)",
        ],
    },
    "lean_bulk": {
        "label": "Lean Bulk (Muscle Building)",
        "proteins": [
            "Chicken thigh skinless (180g)",
            "Lean ground beef 90/10 (180g)",
            "Salmon (170g)",
            "Whole eggs (4)",
            "Greek yogurt 2% fat (300g)",
            "Cottage cheese (250g)",
            "Whey + casein protein shake",
            "Steak sirloin (180g)",
            "Whole milk (500ml)",
            "Tuna canned (200g)",
        ],
        "carbs": [
            "Oats (100g dry)",
            "White rice (100g dry)",
            "Sweet potato (300g)",
            "Whole-grain pasta (100g dry)",
            "Bagel (1 large)",
            "Bananas (2 medium)",
            "Rice cakes (4 cakes)",
            "Fruit (300g mixed)",
            "Whole-wheat tortilla (2 large)",
        ],
        "fats": [
            "Almonds (40g)",
            "Cashews (40g)",
            "Whole milk (500ml)",
            "Olive oil (2 tbsp)",
            "Avocado (1 whole)",
            "Peanut butter (3 tbsp)",
            "Cheese (40g)",
        ],
        "vegetables": [
            "Spinach (150g)",
            "Broccoli (200g)",
            "Mixed vegetables (300g)",
            "Salad greens (150g)",
        ],
        "hydration": "4 litres of water; milk also counts toward calorie target",
        "avoid": [
            "Empty-calorie junk food despite the bulk",
            "Excessive sugary drinks",
            "Skipping meals (eat every 3-4 hours)",
        ],
    },
    "cut": {
        "label": "Cutting Phase (Fat Loss)",
        "proteins": [
            "Chicken breast (180g)",
            "Lean ground turkey 99% (180g)",
            "White fish cod or tilapia (200g)",
            "Egg whites (6) + whole eggs (2)",
            "Greek yogurt 0% (300g)",
            "Cottage cheese low-fat (250g)",
            "Tuna in water (200g)",
            "Whey isolate shake",
            "Tofu firm (250g)",
            "Lean steak (140g)",
        ],
        "carbs": [
            "Oats (40g dry)",
            "Sweet potato (150g)",
            "Berries (200g)",
            "Apple (1 medium)",
            "Brown rice (50g dry)",
            "Quinoa (50g dry)",
            "Cucumber (1 large)",
            "Leafy greens unlimited",
        ],
        "fats": [
            "Avocado (1/4 fruit)",
            "Olive oil (1 tbsp)",
            "Almonds (20g)",
            "Chia seeds (10g)",
            "Egg yolks (within egg allowance)",
        ],
        "vegetables": [
            "Spinach unlimited",
            "Broccoli unlimited",
            "Cauliflower unlimited",
            "Bell peppers unlimited",
            "Zucchini unlimited",
            "Asparagus (200g)",
            "Cucumbers and salad greens unlimited",
        ],
        "hydration": "4+ litres of water — appetite suppressant and metabolism support; black coffee allowed",
        "avoid": [
            "All sugary drinks including fruit juice",
            "Refined carbs (white bread, pastries)",
            "Fried foods of any kind",
            "Alcohol entirely during cut",
            "Calorie-dense sauces and dressings",
        ],
    },
    "endurance_carb": {
        "label": "Endurance Performance (Carb-Forward)",
        "proteins": [
            "Chicken breast (150g)",
            "White fish (180g)",
            "Eggs (3-4)",
            "Greek yogurt (250g)",
            "Lean beef occasional (140g)",
            "Whey protein shake post-run",
            "Tofu (200g)",
        ],
        "carbs": [
            "Oats (100g dry)",
            "Whole-grain bread (3 slices)",
            "Brown rice (100g dry)",
            "Sweet potato (250g)",
            "Whole-wheat pasta (100g dry)",
            "Bananas (2-3)",
            "Dates (4-5)",
            "Fruit (400g mixed)",
            "Honey on oats (1 tbsp)",
        ],
        "fats": [
            "Almonds (28g)",
            "Olive oil (2 tbsp)",
            "Avocado (1/2)",
            "Chia seeds (15g)",
            "Nut butters (2 tbsp)",
        ],
        "vegetables": [
            "Spinach (150g)",
            "Beets (150g)",
            "Bell peppers (1 cup)",
            "Carrots (1 cup)",
            "Mixed greens (200g)",
        ],
        "hydration": "4-5 litres including electrolytes around long sessions; coconut water post-workout",
        "avoid": [
            "Heavy fatty meals within 3 hours of training",
            "Excessive fiber pre-workout",
            "Alcohol during heavy training blocks",
        ],
    },
    "mediterranean": {
        "label": "Mediterranean Wellness",
        "proteins": [
            "Salmon (160g)",
            "White fish (180g)",
            "Sardines or mackerel (140g)",
            "Chicken breast (150g)",
            "Eggs (3)",
            "Greek yogurt (250g)",
            "Lentils cooked (200g)",
            "Chickpeas cooked (200g)",
            "Feta cheese (50g)",
            "Tofu (180g)",
        ],
        "carbs": [
            "Whole-grain bread (2-3 slices)",
            "Whole-wheat pasta (70g dry)",
            "Brown rice or farro (60g dry)",
            "Sweet potato (200g)",
            "Bulgur (60g dry)",
            "Fresh fruit (300g)",
        ],
        "fats": [
            "Extra virgin olive oil (2-3 tbsp)",
            "Avocado (1/2)",
            "Olives (50g)",
            "Walnuts (28g)",
            "Almonds (28g)",
            "Tahini (1 tbsp)",
        ],
        "vegetables": [
            "Tomatoes (1 cup)",
            "Cucumber (1 cup)",
            "Bell peppers (1 cup)",
            "Eggplant (1 cup)",
            "Spinach (150g)",
            "Mixed leafy greens (200g)",
            "Onions and garlic generously",
        ],
        "hydration": "3 litres water; red wine 1 small glass max 2x/week optional",
        "avoid": [
            "Ultra-processed foods",
            "Refined seed oils for cooking (use olive oil)",
            "Sugary desserts daily (limit to occasional)",
        ],
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# TRAINING SPLITS
# Maps LLM-selected split → ordered list of (day_label, focus_category) pairs.
# Deterministic expansion picks exercises from EXERCISE_LIBRARY by focus_category.
# ─────────────────────────────────────────────────────────────────────────────

TRAINING_SPLITS = {
    "full_body_3d": {
        "label": "Full Body 3-Day",
        "days_per_week": 3,
        "schedule": [
            ("Monday",    ["leg_compound", "push_compound", "pull_compound", "core"]),
            ("Tuesday",   ["mobility"]),
            ("Wednesday", ["leg_compound", "push_compound", "pull_compound", "core"]),
            ("Thursday",  ["mobility", "cardio_steady"]),
            ("Friday",    ["leg_compound", "push_compound", "pull_compound", "core"]),
            ("Saturday",  ["cardio_steady", "mobility"]),
            ("Sunday",    ["mobility"]),
        ],
    },
    "upper_lower_4d": {
        "label": "Upper / Lower 4-Day",
        "days_per_week": 4,
        "schedule": [
            ("Monday",    ["push_compound", "pull_compound", "shoulders_isolation", "core"]),
            ("Tuesday",   ["leg_compound", "calves", "core"]),
            ("Wednesday", ["mobility"]),
            ("Thursday",  ["pull_compound", "push_compound", "arms_isolation", "core"]),
            ("Friday",    ["leg_compound", "calves", "core"]),
            ("Saturday",  ["cardio_steady", "mobility"]),
            ("Sunday",    ["mobility"]),
        ],
    },
    "push_pull_legs_5d": {
        "label": "Push / Pull / Legs 5-Day",
        "days_per_week": 5,
        "schedule": [
            ("Monday",    ["push_compound", "shoulders_isolation", "arms_isolation"]),
            ("Tuesday",   ["pull_compound", "arms_isolation", "core"]),
            ("Wednesday", ["leg_compound", "calves", "core"]),
            ("Thursday",  ["push_compound", "shoulders_isolation", "arms_isolation"]),
            ("Friday",    ["pull_compound", "arms_isolation", "core"]),
            ("Saturday",  ["cardio_steady", "mobility"]),
            ("Sunday",    ["mobility"]),
        ],
    },
    "bro_split_5d": {
        "label": "Body-Part Split 5-Day",
        "days_per_week": 5,
        "schedule": [
            ("Monday",    ["push_compound", "shoulders_isolation"]),
            ("Tuesday",   ["pull_compound"]),
            ("Wednesday", ["leg_compound", "calves"]),
            ("Thursday",  ["shoulders_isolation", "core"]),
            ("Friday",    ["arms_isolation", "core"]),
            ("Saturday",  ["cardio_steady", "mobility"]),
            ("Sunday",    ["mobility"]),
        ],
    },
    "athletic_4d": {
        "label": "Athletic Conditioning 4-Day",
        "days_per_week": 4,
        "schedule": [
            ("Monday",    ["leg_compound", "core", "cardio_hiit"]),
            ("Tuesday",   ["push_compound", "pull_compound", "core"]),
            ("Wednesday", ["mobility", "cardio_steady"]),
            ("Thursday",  ["leg_compound", "core", "cardio_hiit"]),
            ("Friday",    ["push_compound", "pull_compound", "core"]),
            ("Saturday",  ["cardio_steady", "mobility"]),
            ("Sunday",    ["mobility"]),
        ],
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# INTENSITY CURVES
# How weekly volume / intensity progresses across the program.
# Returns a multiplier on baseline sets for each week.
# ─────────────────────────────────────────────────────────────────────────────

INTENSITY_CURVES = {
    "linear": {
        "label": "Linear Progression",
        "description": "Add small load or volume each week — best for beginners and early-intermediate trainees.",
    },
    "wave": {
        "label": "Wave Loading",
        "description": "3 weeks of building intensity followed by a 1-week deload — sustainable for intermediates.",
    },
    "block": {
        "label": "Block Periodisation",
        "description": "4-week blocks alternating hypertrophy → strength → peaking — for advanced trainees.",
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# WEEKLY THEMES (deterministic by week number and curve)
# ─────────────────────────────────────────────────────────────────────────────

LINEAR_THEMES = [
    "Foundation Week — Movement Quality",
    "Foundation Week — Light Load Building",
    "Build Phase — Volume Increase",
    "Build Phase — Load Progression",
    "Build Phase — Density Work",
    "Intensification — Heavier Loads",
    "Intensification — Push for PRs",
    "Deload / Recovery Week",
    "Reload — Re-Approach Top Loads",
    "Peak Phase — Strength Test",
    "Peak Phase — Volume + Strength",
    "Peak Phase — Conditioning Focus",
    "Consolidation — Sustainable Output",
    "Consolidation — Personal Records",
    "Consolidation — Skill Refinement",
    "Reset Week — Active Recovery",
    "Reset Week — Mobility Focus",
    "Final Push — Sustained Effort",
    "Final Push — Test Week",
    "Final Push — Hold the Line",
    "Capstone — Personal Best Attempts",
    "Capstone — Combined Conditioning",
    "Capstone — Volume Tolerance",
    "Capstone — Final Test Week",
]


WAVE_THEMES = [
    "Wave 1 — Accumulation",
    "Wave 1 — Intensification",
    "Wave 1 — Peak",
    "Wave 1 — Deload",
    "Wave 2 — Accumulation (heavier)",
    "Wave 2 — Intensification",
    "Wave 2 — Peak",
    "Wave 2 — Deload",
    "Wave 3 — Accumulation",
    "Wave 3 — Intensification",
    "Wave 3 — Peak",
    "Wave 3 — Deload",
    "Wave 4 — Accumulation",
    "Wave 4 — Intensification",
    "Wave 4 — Peak",
    "Wave 4 — Deload",
    "Wave 5 — Accumulation",
    "Wave 5 — Intensification",
    "Wave 5 — Peak",
    "Wave 5 — Deload",
    "Wave 6 — Accumulation",
    "Wave 6 — Intensification",
    "Wave 6 — Peak",
    "Wave 6 — Final Test",
]


BLOCK_THEMES = [
    "Hypertrophy Block — Week 1",
    "Hypertrophy Block — Week 2",
    "Hypertrophy Block — Week 3",
    "Hypertrophy Block — Deload",
    "Strength Block — Week 1",
    "Strength Block — Week 2",
    "Strength Block — Week 3",
    "Strength Block — Deload",
    "Peaking Block — Week 1",
    "Peaking Block — Week 2",
    "Peaking Block — Week 3",
    "Peaking Block — Test Week",
    "Reset Block — Mobility & GPP",
    "Hypertrophy Block 2 — Week 1",
    "Hypertrophy Block 2 — Week 2",
    "Hypertrophy Block 2 — Week 3",
    "Hypertrophy Block 2 — Deload",
    "Strength Block 2 — Week 1",
    "Strength Block 2 — Week 2",
    "Strength Block 2 — Week 3",
    "Strength Block 2 — Deload",
    "Peaking Block 2 — Week 1",
    "Peaking Block 2 — Week 2",
    "Peaking Block 2 — Final Test",
]


# ─────────────────────────────────────────────────────────────────────────────
# RECOVERY & MOTIVATION TEMPLATES
# ─────────────────────────────────────────────────────────────────────────────

RECOVERY_GUIDANCE_HIGH = [
    "Sleep 8-9 hours per night — non-negotiable; recovery is when adaptation happens",
    "10 minutes of static stretching after every training session",
    "Take at least 1 full rest day per week — schedule it, honour it",
    "Walk 8000+ steps daily on non-training days for circulation and recovery",
    "Foam roll major muscle groups 3-4 times per week, 5 minutes per area",
    "Consider 1-2 contrast showers per week (alternate hot/cold for 30 seconds each)",
    "Magnesium-rich foods or supplementation in the evening to support sleep",
]

RECOVERY_GUIDANCE_MODERATE = [
    "Sleep 7-8 hours per night — guard this aggressively",
    "Light static stretching after sessions (5-10 minutes on tight areas)",
    "1-2 rest days per week depending on session intensity",
    "Walk daily — at minimum 6000 steps",
    "Foam roll 2-3 times per week on tightest areas",
]

RECOVERY_GUIDANCE_LOW = [
    "Sleep at least 7 hours per night",
    "Brief cooldown stretching after sessions",
    "1 rest day per week — listen to your body for a second if needed",
    "Keep daily activity up — walks, taking stairs, standing breaks",
]

MOTIVATION_TIPS = [
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


# ─────────────────────────────────────────────────────────────────────────────
# MILESTONE TEMPLATES (per goal)
# ─────────────────────────────────────────────────────────────────────────────

MILESTONES_BY_GOAL = {
    "lose_weight": [
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
    "gain_weight": [
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
    "build_muscle": [
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
    "improve_endurance": [
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
    "general_wellness": [
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


# ─────────────────────────────────────────────────────────────────────────────
# CALORIE BASE TARGETS by goal — used as fallback if LLM JSON malformed
# ─────────────────────────────────────────────────────────────────────────────

GOAL_CALORIE_DEFAULTS = {
    "lose_weight":       1800,
    "gain_weight":       2900,
    "build_muscle":      2700,
    "improve_endurance": 2500,
    "general_wellness":  2200,
}

GOAL_MACRO_DEFAULTS = {
    "lose_weight":       {"protein": 0.40, "carbs": 0.35, "fats": 0.25},
    "gain_weight":       {"protein": 0.25, "carbs": 0.50, "fats": 0.25},
    "build_muscle":      {"protein": 0.30, "carbs": 0.45, "fats": 0.25},
    "improve_endurance": {"protein": 0.20, "carbs": 0.60, "fats": 0.20},
    "general_wellness":  {"protein": 0.25, "carbs": 0.45, "fats": 0.30},
}

GOAL_DIET_DEFAULTS = {
    "lose_weight":       "cut",
    "gain_weight":       "lean_bulk",
    "build_muscle":      "high_protein_balanced",
    "improve_endurance": "endurance_carb",
    "general_wellness":  "mediterranean",
}


# ─────────────────────────────────────────────────────────────────────────────
# CONTRACT
# ─────────────────────────────────────────────────────────────────────────────


class FitnessPlanContract(gl.Contract):
    # ── Persistent state ────────────────────────────────────────────────────
    owner: Address
    paused: bool

    # plan accounting
    plan_counter: u256
    plans: TreeMap[str, str]          # plan_id (str) → JSON-encoded plan record
    user_plans: TreeMap[Address, str] # wallet → JSON array of plan_id strings

    # pricing — values are in whole-GEN units (NOT wei) for simplicity
    price_1mo: u256
    price_3mo: u256
    price_6mo: u256

    # revenue tracking
    total_plans_created: u256
    total_plans_paid: u256
    total_revenue_gen: u256

    # plan ratings (plan_id → "rating:comment_json")
    plan_ratings: TreeMap[str, str]

    # ── Constructor ─────────────────────────────────────────────────────────
    def __init__(self) -> None:
        self.owner = gl.message.sender_address
        self.paused = False
        self.plan_counter = u256(0)
        self.price_1mo = u256(5)
        self.price_3mo = u256(12)
        self.price_6mo = u256(20)
        self.total_plans_created = u256(0)
        self.total_plans_paid = u256(0)
        self.total_revenue_gen = u256(0)

    # ════════════════════════════════════════════════════════════════════════
    # WRITE METHODS
    # ════════════════════════════════════════════════════════════════════════

    @gl.public.write
    def submit_fitness_profile(
        self,
        age: int,
        weight: str,
        weight_unit: str,
        height: str,
        height_unit: str,
        fitness_level: str,
        goal_type: str,
        duration_months: int,
    ) -> str:
        """Validate inputs, run LLM consensus on a tiny recipe, deterministically
        expand to a full plan, persist it, and return the on-chain plan id."""
        assert not self.paused, "Contract is paused"
        self._validate_profile(
            age, weight, weight_unit, height, height_unit,
            fitness_level, goal_type, duration_months,
        )

        sender = gl.message.sender_address
        plan_id = str(self.plan_counter)
        self.plan_counter = u256(int(self.plan_counter) + 1)
        self.total_plans_created = u256(int(self.total_plans_created) + 1)

        price = self._price_for_duration(duration_months)

        profile = {
            "age": age,
            "weight": weight,
            "weight_unit": weight_unit,
            "height": height,
            "height_unit": height_unit,
            "fitness_level": fitness_level,
            "goal_type": goal_type,
        }

        # ── 1. Non-deterministic step — small constrained JSON recipe ──────
        recipe = self._generate_plan_recipe(profile, duration_months)

        # ── 2. Deterministic expansion into full plan ──────────────────────
        plan_content = self._expand_plan(profile, duration_months, recipe)

        record = {
            "plan_id": plan_id,
            "wallet": sender.as_hex,
            "profile": profile,
            "duration_months": duration_months,
            "status": "ready",
            "recipe": recipe,
            "plan_content": plan_content,
            "price": price,
            "paid": False,
            "rating": None,
        }
        self.plans[plan_id] = json.dumps(record)

        existing_raw = self.user_plans.get(sender, "[]")
        existing_ids = json.loads(existing_raw)
        existing_ids.append(plan_id)
        self.user_plans[sender] = json.dumps(existing_ids)

        return plan_id

    @gl.public.write
    def mark_plan_paid(self, plan_id: str) -> bool:
        assert not self.paused, "Contract is paused"
        assert plan_id in self.plans, "Plan not found"
        record = json.loads(self.plans[plan_id])

        caller_hex = gl.message.sender_address.as_hex
        is_caller_owner = gl.message.sender_address == self.owner
        assert (
            caller_hex == record["wallet"] or is_caller_owner
        ), "Not authorised to mark this plan paid"

        assert not record["paid"], "Plan already paid"

        record["paid"] = True
        record["status"] = "unlocked"
        self.plans[plan_id] = json.dumps(record)

        self.total_plans_paid = u256(int(self.total_plans_paid) + 1)
        self.total_revenue_gen = u256(
            int(self.total_revenue_gen) + int(record["price"])
        )
        return True

    @gl.public.write
    def rate_plan(self, plan_id: str, stars: int, comment: str) -> bool:
        assert plan_id in self.plans, "Plan not found"
        record = json.loads(self.plans[plan_id])
        assert (
            gl.message.sender_address.as_hex == record["wallet"]
        ), "Only the plan owner may rate it"
        assert record["paid"], "Plan must be paid before rating"
        assert 1 <= stars <= 5, "Rating must be between 1 and 5"
        assert len(comment) <= 280, "Comment must be 280 characters or fewer"

        rating_payload = {
            "stars": stars,
            "comment": comment,
            "wallet": record["wallet"],
        }
        self.plan_ratings[plan_id] = json.dumps(rating_payload)

        record["rating"] = stars
        self.plans[plan_id] = json.dumps(record)
        return True

    @gl.public.write
    def update_pricing(self, duration_months: int, new_price: int) -> bool:
        assert gl.message.sender_address == self.owner, "Only owner can update pricing"
        assert duration_months in [1, 3, 6], "Invalid duration"
        assert 1 <= new_price <= 1000, "Price must be between 1 and 1000 GEN"
        if duration_months == 1:
            self.price_1mo = u256(new_price)
        elif duration_months == 3:
            self.price_3mo = u256(new_price)
        else:
            self.price_6mo = u256(new_price)
        return True

    @gl.public.write
    def transfer_ownership(self, new_owner_hex: str) -> bool:
        assert gl.message.sender_address == self.owner, "Only owner can transfer ownership"
        new_owner = Address(new_owner_hex)
        assert new_owner != self.owner, "New owner must be different"
        self.owner = new_owner
        return True

    @gl.public.write
    def set_paused(self, paused: bool) -> bool:
        assert gl.message.sender_address == self.owner, "Only owner can pause/unpause"
        self.paused = paused
        return True

    # ════════════════════════════════════════════════════════════════════════
    # VIEW METHODS
    # ════════════════════════════════════════════════════════════════════════

    @gl.public.view
    def get_plan(self, plan_id: str) -> dict:
        assert plan_id in self.plans, "Plan not found"
        record = json.loads(self.plans[plan_id])
        public_view = {
            "plan_id":         record["plan_id"],
            "wallet":          record["wallet"],
            "status":          record["status"],
            "duration_months": record["duration_months"],
            "price":           record["price"],
            "paid":            record["paid"],
            "rating":          record.get("rating"),
            "recipe":          record.get("recipe"),
        }
        if record["paid"]:
            public_view["plan_content"] = record["plan_content"]
        else:
            public_view["plan_content"] = None
        return public_view

    @gl.public.view
    def get_user_plans(self, wallet_hex: str) -> list:
        addr = Address(wallet_hex)
        raw = self.user_plans.get(addr, "[]")
        return json.loads(raw)

    @gl.public.view
    def get_pricing(self) -> dict:
        return {
            "1_month":  int(self.price_1mo),
            "3_months": int(self.price_3mo),
            "6_months": int(self.price_6mo),
        }

    @gl.public.view
    def get_plan_count(self) -> int:
        return int(self.plan_counter)

    @gl.public.view
    def get_stats(self) -> dict:
        return {
            "total_plans_created": int(self.total_plans_created),
            "total_plans_paid":    int(self.total_plans_paid),
            "total_revenue_gen":   int(self.total_revenue_gen),
            "paused":              self.paused,
            "owner":               self.owner.as_hex,
        }

    @gl.public.view
    def get_rating(self, plan_id: str) -> dict:
        if plan_id not in self.plan_ratings:
            return {"rated": False}
        payload = json.loads(self.plan_ratings[plan_id])
        return {"rated": True, **payload}

    @gl.public.view
    def is_owner(self, wallet_hex: str) -> bool:
        return Address(wallet_hex) == self.owner

    # ════════════════════════════════════════════════════════════════════════
    # INTERNAL — VALIDATION
    # ════════════════════════════════════════════════════════════════════════

    def _validate_profile(
        self, age, weight, weight_unit, height, height_unit,
        fitness_level, goal_type, duration_months,
    ) -> None:
        assert duration_months in [1, 3, 6], "Duration must be 1, 3, or 6 months"
        assert 10 <= age <= 100, "Age must be between 10 and 100"
        assert fitness_level in ["beginner", "intermediate", "advanced"], "Invalid fitness level"
        assert goal_type in [
            "lose_weight", "gain_weight", "build_muscle",
            "improve_endurance", "general_wellness",
        ], "Invalid goal type"
        assert weight_unit in ["kg", "lbs"], "Invalid weight unit"
        assert height_unit in ["cm", "ft"], "Invalid height unit"
        # weight / height are strings (contract input) — sanity-check numeric content
        try:
            float(weight)
            float(height)
        except ValueError:
            assert False, "Weight and height must be numeric strings"

    def _price_for_duration(self, duration_months: int) -> int:
        if duration_months == 1:
            return int(self.price_1mo)
        if duration_months == 3:
            return int(self.price_3mo)
        return int(self.price_6mo)

    # ════════════════════════════════════════════════════════════════════════
    # INTERNAL — LLM CONSENSUS (tiny JSON recipe)
    # ════════════════════════════════════════════════════════════════════════

    def _generate_plan_recipe(self, profile: dict, duration_months: int) -> dict:
        """The ONLY non-deterministic step. Validators must reach comparative
        consensus on a small, structured JSON 'recipe'. The rich plan is then
        derived from this recipe deterministically by every validator."""

        weight = float(profile["weight"])
        height = float(profile["height"])
        goal_label = profile["goal_type"].replace("_", " ")

        # Inform the LLM about acceptable enum values so it stays in-bounds
        prompt = f"""You are an elite certified personal trainer and registered dietitian.
A client needs a fitness plan recipe (NOT the full plan — just the structured choices that a
deterministic generator will then expand into the full plan).

CLIENT PROFILE:
- Age: {profile['age']} years
- Weight: {weight} {profile['weight_unit']}
- Height: {height} {profile['height_unit']}
- Fitness Level: {profile['fitness_level']}
- Primary Goal: {goal_label}
- Program duration: {duration_months} months

Return ONLY a single valid JSON object with EXACTLY these keys, no extras, no markdown,
no preamble, no trailing text:

{{
  "training_split": "<one of: full_body_3d, upper_lower_4d, push_pull_legs_5d, bro_split_5d, athletic_4d>",
  "intensity_curve": "<one of: linear, wave, block>",
  "calorie_target": <integer kcal between 1400 and 4000>,
  "macro_ratio": {{"protein": <float 0.15-0.45>, "carbs": <float 0.20-0.65>, "fats": <float 0.15-0.45>}},
  "cardio_minutes_per_week": <integer 0-300>,
  "diet_style": "<one of: high_protein_balanced, lean_bulk, cut, endurance_carb, mediterranean>",
  "recovery_priority": "<one of: high, moderate, low>",
  "personalization_notes": "<max 240 characters, plain text, no JSON or markdown>"
}}

CONSTRAINTS:
- training_split must reflect the fitness level: beginners → full_body_3d or upper_lower_4d;
  intermediate → upper_lower_4d or athletic_4d; advanced → push_pull_legs_5d or bro_split_5d
- intensity_curve: beginners → linear; intermediate → linear or wave; advanced → wave or block
- calorie_target must align with the goal:
  lose_weight → deficit (≈ bodyweight_kg × 22-26 if metric, lower end of range)
  gain_weight or build_muscle → surplus (bodyweight_kg × 33-38)
  improve_endurance → maintenance + activity (bodyweight_kg × 32-36)
  general_wellness → maintenance (bodyweight_kg × 28-32)
- macro_ratio values MUST sum to 1.0 ± 0.02
- diet_style should match the goal naturally
- cardio_minutes_per_week: lose_weight 120-200; gain_weight or build_muscle 0-90;
  improve_endurance 180-300; general_wellness 90-150
- personalization_notes: 1-2 sentences specific to this client's age and goal — no generic platitudes

Output ONLY the JSON object."""

        def get_recipe() -> str:
            result = gl.nondet.exec_prompt(prompt)
            # Strip any accidental fences just in case
            result = result.replace("```json", "").replace("```", "").strip()
            return result

        agreed_text = gl.eq_principle.prompt_comparative(
            get_recipe,
            (
                "Two recipes are equivalent if and only if ALL of the following hold: "
                "(1) training_split is identical, (2) intensity_curve is identical, "
                "(3) diet_style is identical, (4) recovery_priority is identical, "
                "(5) calorie_target differs by no more than 200 kcal, "
                "(6) each macro_ratio component differs by no more than 0.05, "
                "(7) cardio_minutes_per_week differs by no more than 30. "
                "personalization_notes wording may differ freely."
            ),
        )

        # Parse and validate the agreed recipe — fall back to safe defaults per
        # field if anything is missing or malformed so a single LLM hiccup never
        # bricks plan generation.
        try:
            parsed = json.loads(agreed_text)
        except (json.JSONDecodeError, TypeError):
            parsed = {}

        return self._sanitise_recipe(parsed, profile)

    def _sanitise_recipe(self, raw: dict, profile: dict) -> dict:
        goal = profile["goal_type"]
        level = profile["fitness_level"]

        # Training split — fallback by level
        split = raw.get("training_split")
        if split not in TRAINING_SPLITS:
            split = (
                "full_body_3d"      if level == "beginner"     else
                "upper_lower_4d"    if level == "intermediate" else
                "push_pull_legs_5d"
            )

        # Intensity curve — fallback by level
        curve = raw.get("intensity_curve")
        if curve not in INTENSITY_CURVES:
            curve = (
                "linear" if level == "beginner"     else
                "wave"   if level == "intermediate" else
                "block"
            )

        # Diet style
        diet_style = raw.get("diet_style")
        if diet_style not in MEAL_LIBRARY:
            diet_style = GOAL_DIET_DEFAULTS[goal]

        # Recovery priority
        recovery_priority = raw.get("recovery_priority")
        if recovery_priority not in ["high", "moderate", "low"]:
            recovery_priority = "moderate"

        # Calorie target
        try:
            calorie_target = int(raw.get("calorie_target") or 0)
        except (TypeError, ValueError):
            calorie_target = 0
        if not (1200 <= calorie_target <= 4500):
            calorie_target = GOAL_CALORIE_DEFAULTS[goal]

        # Macro ratio
        macro = raw.get("macro_ratio") or {}
        try:
            p = float(macro.get("protein", 0))
            c = float(macro.get("carbs",   0))
            f = float(macro.get("fats",    0))
        except (TypeError, ValueError):
            p = c = f = 0
        total = p + c + f
        if not (0.95 <= total <= 1.05) or min(p, c, f) <= 0:
            defaults = GOAL_MACRO_DEFAULTS[goal]
            p, c, f = defaults["protein"], defaults["carbs"], defaults["fats"]

        # Cardio minutes
        try:
            cardio_minutes = int(raw.get("cardio_minutes_per_week") or 0)
        except (TypeError, ValueError):
            cardio_minutes = 0
        if not (0 <= cardio_minutes <= 360):
            cardio_minutes = 120 if goal == "lose_weight" else 90

        # Personalisation notes
        notes = raw.get("personalization_notes")
        if not isinstance(notes, str) or len(notes) == 0:
            notes = (
                f"Tailored for a {profile['age']}-year-old aiming to "
                f"{profile['goal_type'].replace('_', ' ')}."
            )
        if len(notes) > 240:
            notes = notes[:237] + "..."

        return {
            "training_split":          split,
            "intensity_curve":         curve,
            "calorie_target":          calorie_target,
            "macro_ratio":             {"protein": round(p, 2), "carbs": round(c, 2), "fats": round(f, 2)},
            "cardio_minutes_per_week": cardio_minutes,
            "diet_style":              diet_style,
            "recovery_priority":       recovery_priority,
            "personalization_notes":   notes,
        }

    # ════════════════════════════════════════════════════════════════════════
    # INTERNAL — DETERMINISTIC PLAN EXPANSION
    # ════════════════════════════════════════════════════════════════════════

    def _expand_plan(self, profile: dict, duration_months: int, recipe: dict) -> dict:
        """Build the full multi-week plan deterministically from the recipe.
        Every validator will compute the IDENTICAL output from the same inputs."""

        weeks = duration_months * 4
        level = profile["fitness_level"]
        goal = profile["goal_type"]

        split_def = TRAINING_SPLITS[recipe["training_split"]]
        curve = recipe["intensity_curve"]

        # Pick weekly themes deterministically based on curve and week index
        themes_pool = (
            LINEAR_THEMES if curve == "linear" else
            WAVE_THEMES   if curve == "wave"   else
            BLOCK_THEMES
        )

        weekly_schedule = []
        for w in range(weeks):
            week_number = w + 1
            theme = themes_pool[w % len(themes_pool)]
            days = self._build_week_days(split_def, level, week_number, curve)
            weekly_schedule.append({
                "week_number": week_number,
                "theme": theme,
                "schedule": days,
            })

        nutrition = self._build_nutrition(recipe, goal)
        milestones = self._build_milestones(goal, weeks)
        recovery = self._build_recovery(recipe["recovery_priority"])
        motivation = self._build_motivation(weeks)
        summary = self._build_summary(profile, recipe, duration_months, weeks)

        return {
            "summary":              summary,
            "training_split_label": split_def["label"],
            "intensity_curve":      INTENSITY_CURVES[curve],
            "weekly_schedule":      weekly_schedule,
            "nutrition_guidelines": nutrition,
            "milestones":           milestones,
            "recovery_guidance":    recovery,
            "motivation_tips":      motivation,
        }

    def _build_week_days(self, split_def: dict, level: str, week_number: int, curve: str) -> list:
        """Construct one week's worth of days from the split definition.
        Exercise selection rotates deterministically per week so consecutive
        weeks aren't identical."""

        days = []
        for day_label, focus_categories in split_def["schedule"]:
            if not focus_categories:
                days.append({"day": day_label, "focus": "Rest", "exercises": []})
                continue

            primary_focus = focus_categories[0]
            secondary = focus_categories[1:]
            focus_label = self._focus_label(primary_focus, secondary)
            exercises = []

            for cat in focus_categories:
                pool = EXERCISE_LIBRARY.get(cat, [])
                if not pool:
                    continue
                # Rotate which exercises appear based on week number
                pick_count = 2 if cat in ("push_compound", "pull_compound", "leg_compound") else 1
                pick_count = min(pick_count, len(pool))
                start = (week_number - 1) % len(pool)
                chosen = []
                for i in range(pick_count):
                    chosen.append(pool[(start + i) % len(pool)])

                for ex in chosen:
                    name, beg_sets, int_sets, adv_sets, rest_sec, muscles, notes = ex
                    sets_reps = (
                        beg_sets if level == "beginner" else
                        int_sets if level == "intermediate" else
                        adv_sets
                    )
                    # Scale slightly per week based on curve
                    scaled = self._scale_sets_reps(sets_reps, week_number, curve)
                    exercises.append({
                        "name":    name,
                        "scheme":  scaled,
                        "rest":    f"{rest_sec} seconds" if rest_sec > 0 else "no rest",
                        "muscles": muscles,
                        "notes":   notes,
                    })

            days.append({
                "day":       day_label,
                "focus":     focus_label,
                "exercises": exercises,
            })
        return days

    def _focus_label(self, primary: str, secondary: list) -> str:
        labels = {
            "push_compound":        "Push (Chest / Shoulders / Triceps)",
            "pull_compound":        "Pull (Back / Biceps)",
            "leg_compound":         "Legs (Quads / Hamstrings / Glutes)",
            "core":                 "Core",
            "cardio_steady":        "Steady-State Cardio",
            "cardio_hiit":          "HIIT / Conditioning",
            "mobility":             "Mobility & Active Recovery",
            "arms_isolation":       "Arms (Biceps + Triceps)",
            "shoulders_isolation": "Shoulders (Delts)",
            "calves":               "Calves",
        }
        base = labels.get(primary, primary)
        if secondary:
            return base + " + " + ", ".join(labels.get(s, s) for s in secondary)
        return base

    def _scale_sets_reps(self, scheme: str, week_number: int, curve: str) -> str:
        """Apply a small textual annotation reflecting weekly progression.
        We don't try to be clever with set counts — we just append a hint that
        every validator computes identically."""
        if curve == "linear":
            if week_number <= 4:
                return f"{scheme} — establish form"
            if week_number <= 8:
                return f"{scheme} — add 2.5-5% load over week 4"
            if week_number <= 12:
                return f"{scheme} — push for PRs on top sets"
            if week_number <= 16:
                return f"{scheme} — deload load by 10%, refocus form"
            if week_number <= 20:
                return f"{scheme} — re-approach top loads"
            return f"{scheme} — test week, plan PR attempts"
        if curve == "wave":
            mod = (week_number - 1) % 4
            if mod == 0: return f"{scheme} — accumulation, manageable load"
            if mod == 1: return f"{scheme} — intensification, +5%"
            if mod == 2: return f"{scheme} — peak, +5% again"
            return f"{scheme} — DELOAD, drop load 20%"
        # block
        mod = (week_number - 1) % 4
        block_idx = (week_number - 1) // 4
        block_name = ["Hypertrophy", "Strength", "Peaking"][block_idx % 3]
        if mod == 3:
            return f"{scheme} — DELOAD ({block_name} block close)"
        return f"{scheme} — {block_name} focus"

    def _build_nutrition(self, recipe: dict, goal: str) -> dict:
        diet = MEAL_LIBRARY[recipe["diet_style"]]
        kcal = recipe["calorie_target"]
        ratio = recipe["macro_ratio"]
        protein_g = int((kcal * ratio["protein"]) / 4)
        carbs_g   = int((kcal * ratio["carbs"])   / 4)
        fats_g    = int((kcal * ratio["fats"])    / 9)

        return {
            "diet_style":     diet["label"],
            "daily_calories": kcal,
            "protein_g":      protein_g,
            "carbs_g":        carbs_g,
            "fats_g":         fats_g,
            "macro_ratio":    ratio,
            "proteins":       diet["proteins"],
            "carbs":          diet["carbs"],
            "fats":           diet["fats"],
            "vegetables":     diet["vegetables"],
            "hydration":      diet["hydration"],
            "foods_to_avoid": diet["avoid"],
            "meal_timing":    self._meal_timing_for_goal(goal),
        }

    def _meal_timing_for_goal(self, goal: str) -> list:
        if goal == "lose_weight":
            return [
                "3 main meals plus 1 protein-rich snack — total 4 eating windows",
                "Highest-carb meal at the meal closest to your training session",
                "Stop eating 2-3 hours before sleep to support recovery and sleep quality",
                "Protein in every meal — keeps satiety up during a deficit",
            ]
        if goal in ("gain_weight", "build_muscle"):
            return [
                "5-6 meals per day spaced 3 hours apart — bulk requires consistent intake",
                "Largest carb meal in the 2-3 hours after training",
                "Casein-rich meal (Greek yogurt or cottage cheese) before sleep",
                "Protein every meal — 30-45g per meal target",
            ]
        if goal == "improve_endurance":
            return [
                "Carb-rich meal 2-3 hours before long sessions",
                "Carb refuel within 30-60 minutes after long sessions",
                "Hydrate consistently throughout the day — not just around sessions",
                "Protein with every main meal for repair without dominating macros",
            ]
        # general_wellness
        return [
            "3 balanced meals plus 1-2 small snacks if hungry",
            "Largest meal mid-day — supports steady afternoon energy",
            "Light dinner 2-3 hours before bed",
            "Protein in every meal for satiety and recovery",
        ]

    def _build_milestones(self, goal: str, weeks: int) -> list:
        pool = MILESTONES_BY_GOAL[goal]
        milestones = []
        # spread evenly across the program
        count = min(len(pool), max(4, weeks // 2))
        step = max(1, weeks // count)
        for i in range(count):
            week_mark = min(weeks, (i + 1) * step)
            milestones.append({
                "week":        week_mark,
                "title":       f"Milestone {i + 1}",
                "description": pool[i % len(pool)],
            })
        return milestones

    def _build_recovery(self, priority: str) -> list:
        if priority == "high":
            return RECOVERY_GUIDANCE_HIGH
        if priority == "moderate":
            return RECOVERY_GUIDANCE_MODERATE
        return RECOVERY_GUIDANCE_LOW

    def _build_motivation(self, weeks: int) -> list:
        # rotate through the pool deterministically so longer programs get more variety
        count = min(len(MOTIVATION_TIPS), max(6, weeks // 3))
        return MOTIVATION_TIPS[:count]

    def _build_summary(self, profile: dict, recipe: dict, duration_months: int, weeks: int) -> str:
        goal_label = profile["goal_type"].replace("_", " ")
        split_label = TRAINING_SPLITS[recipe["training_split"]]["label"]
        diet_label = MEAL_LIBRARY[recipe["diet_style"]]["label"]
        return (
            f"This is a {duration_months}-month ({weeks}-week) "
            f"{split_label.lower()} program for a "
            f"{profile['fitness_level']} client whose primary goal is "
            f"to {goal_label}. Nutrition follows the {diet_label} template at "
            f"{recipe['calorie_target']} kcal/day with macros split "
            f"{int(recipe['macro_ratio']['protein']*100)}/"
            f"{int(recipe['macro_ratio']['carbs']*100)}/"
            f"{int(recipe['macro_ratio']['fats']*100)} P/C/F. "
            f"Recovery priority: {recipe['recovery_priority']}. "
            f"Personalisation: {recipe['personalization_notes']}"
        )
