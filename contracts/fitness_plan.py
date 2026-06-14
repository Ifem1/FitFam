# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from genlayer import *


class FitnessPlanContract(gl.Contract):
    # ── Persistent state ────────────────────────────────────────────────────
    owner: Address
    plan_counter: u256
    plans: TreeMap[str, str]         # plan_id (str) → JSON-encoded plan record
    user_plans: TreeMap[Address, str] # wallet address → JSON array of plan_id strings
    price_1mo: u256                  # price in smallest GEN unit (GEN × 10^18)
    price_3mo: u256
    price_6mo: u256

    # ── Constructor ─────────────────────────────────────────────────────────
    def __init__(self) -> None:
        self.owner = gl.message.sender_address
        self.plan_counter = u256(0)
        # Default pricing: 5 / 12 / 20 GEN
        self.price_1mo = u256(5)
        self.price_3mo = u256(12)
        self.price_6mo = u256(20)

    # ── Write: Submit fitness profile → generates plan via LLM consensus ────
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
        assert duration_months in [1, 3, 6], "Duration must be 1, 3, or 6 months"
        assert 10 <= age <= 100, "Age must be between 10 and 100"
        assert fitness_level in ["beginner", "intermediate", "advanced"], "Invalid fitness level"
        assert goal_type in [
            "lose_weight", "gain_weight", "build_muscle",
            "improve_endurance", "general_wellness",
        ], "Invalid goal type"
        assert weight_unit in ["kg", "lbs"], "Invalid weight unit"
        assert height_unit in ["cm", "ft"], "Invalid height unit"

        sender = gl.message.sender_address

        # Assign plan ID
        plan_id = str(self.plan_counter)
        self.plan_counter = u256(int(self.plan_counter) + 1)

        # Determine price for this duration
        if duration_months == 1:
            price = int(self.price_1mo)
        elif duration_months == 3:
            price = int(self.price_3mo)
        else:
            price = int(self.price_6mo)

        # Build profile dict (serialised for prompt)
        profile = {
            "age": age,
            "weight": weight,
            "weight_unit": weight_unit,
            "height": height,
            "height_unit": height_unit,
            "fitness_level": fitness_level,
            "goal_type": goal_type,
        }

        # Generate the plan via LLM — goes through GenLayer consensus
        plan_content_json = self._generate_plan(profile, duration_months)

        # Store plan record
        record = {
            "plan_id": plan_id,
            "wallet": sender.as_hex,
            "profile": profile,
            "duration_months": duration_months,
            "status": "ready",
            "plan_content": plan_content_json,
            "price": price,
            "paid": False,
        }
        self.plans[plan_id] = json.dumps(record)

        # Update user → [plan_id, ...] index
        existing_raw = self.user_plans.get(sender, "[]")
        existing_ids = json.loads(existing_raw)
        existing_ids.append(plan_id)
        self.user_plans[sender] = json.dumps(existing_ids)

        return plan_id

    # ── Write: Mark plan as paid (called by backend after GEN payment verified)
    @gl.public.write
    def mark_plan_paid(self, plan_id: str) -> bool:
        assert plan_id in self.plans, "Plan not found"

        record = json.loads(self.plans[plan_id])

        # Only the plan owner or the contract owner may mark it paid
        caller_hex = gl.message.sender_address.as_hex
        assert (
            caller_hex == record["wallet"] or
            gl.message.sender_address == self.owner
        ), "Not authorised"

        assert not record["paid"], "Plan already paid"

        record["paid"] = True
        record["status"] = "unlocked"
        self.plans[plan_id] = json.dumps(record)
        return True

    # ── Write: Update pricing tiers (owner only) ────────────────────────────
    @gl.public.write
    def update_pricing(self, duration_months: int, new_price: int) -> bool:
        assert gl.message.sender_address == self.owner, "Only owner can update pricing"
        assert duration_months in [1, 3, 6], "Invalid duration"
        assert new_price > 0, "Price must be positive"

        if duration_months == 1:
            self.price_1mo = u256(new_price)
        elif duration_months == 3:
            self.price_3mo = u256(new_price)
        else:
            self.price_6mo = u256(new_price)

        return True

    # ── View: Get plan (full content only if paid, metadata only if locked) ─
    @gl.public.view
    def get_plan(self, plan_id: str) -> dict:
        assert plan_id in self.plans, "Plan not found"
        record = json.loads(self.plans[plan_id])

        if record["paid"]:
            return {
                "plan_id": record["plan_id"],
                "status": record["status"],
                "duration_months": record["duration_months"],
                "plan_content": record["plan_content"],
                "price": record["price"],
                "paid": record["paid"],
            }
        else:
            return {
                "plan_id": record["plan_id"],
                "status": record["status"],
                "duration_months": record["duration_months"],
                "plan_content": None,
                "price": record["price"],
                "paid": record["paid"],
            }

    # ── View: Get all plan IDs for a wallet address ──────────────────────────
    @gl.public.view
    def get_user_plans(self, wallet_hex: str) -> list:
        addr = Address(wallet_hex)
        raw = self.user_plans.get(addr, "[]")
        return json.loads(raw)

    # ── View: Get current pricing ────────────────────────────────────────────
    @gl.public.view
    def get_pricing(self) -> dict:
        return {
            "1_month": int(self.price_1mo),
            "3_months": int(self.price_3mo),
            "6_months": int(self.price_6mo),
        }

    # ── View: Total number of plans created ──────────────────────────────────
    @gl.public.view
    def get_plan_count(self) -> int:
        return int(self.plan_counter)

    # ── Internal: LLM plan generation (non-deterministic, consensus required) ─
    def _generate_plan(self, profile: dict, duration_months: int) -> str:
        weeks = duration_months * 4
        goal_label = profile["goal_type"].replace("_", " ")
        level = profile["fitness_level"]

        prompt = f"""You are an elite certified personal trainer and registered dietitian.
Generate a complete, structured {duration_months}-month ({weeks}-week) fitness and nutrition plan for this client:

CLIENT PROFILE:
- Age: {profile['age']} years old
- Weight: {profile['weight']} {profile['weight_unit']}
- Height: {profile['height']} {profile['height_unit']}
- Fitness Level: {level}
- Primary Goal: {goal_label}

Return ONLY a valid JSON object with this exact structure (no extra text, no markdown fences):
{{
  "summary": "2-3 sentence overview tailored to the client profile and goal",
  "weekly_schedule": [
    {{
      "week_number": 1,
      "theme": "Foundation Week",
      "schedule": [
        {{
          "day": "Monday",
          "focus": "Upper Body Strength",
          "exercises": [
            {{
              "name": "Push-Ups",
              "sets": 3,
              "reps": "10-12",
              "rest": "60 seconds",
              "notes": "Keep core tight"
            }}
          ]
        }},
        {{
          "day": "Tuesday",
          "focus": "Rest / Active Recovery",
          "exercises": []
        }}
      ]
    }}
  ],
  "nutrition_guidelines": {{
    "daily_calories": 2200,
    "protein_g": 165,
    "carbs_g": 220,
    "fats_g": 73,
    "meal_timing": [
      "Pre-workout meal 90 minutes before training",
      "Post-workout protein shake within 30 minutes"
    ],
    "foods_to_eat": [
      "Lean meats: chicken breast, turkey, white fish",
      "Complex carbs: oats, sweet potato, brown rice",
      "Healthy fats: avocado, olive oil, nuts"
    ],
    "foods_to_avoid": [
      "Processed sugars and refined carbohydrates",
      "Trans fats and deep-fried foods",
      "Excessive alcohol"
    ],
    "hydration": "Drink 3-4 litres of water daily"
  }},
  "milestones": [
    {{
      "week": 4,
      "title": "Foundation Complete",
      "description": "By week 4 expect improved form, better sleep, and initial body composition changes"
    }}
  ],
  "recovery_guidance": [
    "Sleep 7-9 hours per night — this is when muscle repair happens",
    "Perform 10 minutes of static stretching after every session",
    "Take at least 1 full rest day per week — schedule it, honour it"
  ],
  "motivation_tips": [
    "Log every workout — visible progress compounds motivation",
    "Prepare meals in advance to remove willpower friction on busy days",
    "Set a weekly non-scale goal (e.g. 5 workouts completed) alongside body goals"
  ]
}}

REQUIREMENTS:
- Include all {weeks} weeks in weekly_schedule with progressive overload each week
- Tailor exercise selection and volume to {level} level — beginners: 3 days/week compound movements; intermediate: 4 days; advanced: 5 days with periodisation
- Calories and macros must align with {goal_label} (deficit for fat loss, surplus for muscle/weight gain, maintenance for wellness/endurance)
- At least {duration_months * 2} milestones spread across the plan duration
- Output must be valid JSON only — no preamble, no markdown, no trailing text"""

        def get_plan_json() -> str:
            result = gl.nondet.exec_prompt(prompt)
            # Strip any accidental markdown fences
            result = result.replace("```json", "").replace("```", "").strip()
            return result

        result = gl.eq_principle.prompt_comparative(
            get_plan_json,
            "The fitness plans are equivalent if they provide an appropriate training structure for the stated fitness level and goal, with progressive weekly overload, nutritionally sound macro targets aligned with the goal, and all required JSON fields present. Minor differences in specific exercises, exact rep counts, or phrasing are acceptable.",
        )

        return result
