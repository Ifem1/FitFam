'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronRight, ChevronLeft, Loader2, Check, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type WeightUnit = 'kg' | 'lbs'
type HeightUnit = 'cm' | 'ft'
type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'
type GoalType = 'lose_weight' | 'gain_weight' | 'build_muscle' | 'improve_endurance' | 'general_wellness'
type Duration = 1 | 3 | 6

const MAX_GOALS = 3

interface FormData {
  age: string
  weight: string
  weight_unit: WeightUnit
  height: string
  height_unit: HeightUnit
  goal_types: GoalType[]
  fitness_level: FitnessLevel | ''
  allergies: string[]
  allergy_other: string
  preferred_proteins: string[]
  region: string
  duration_months: Duration | null
}

const PRICING: Record<number, number> = { 1: 5, 3: 12, 6: 20 }

const GOALS = [
  { value: 'lose_weight',       label: 'Lose Weight',        desc: 'Burn fat, lean out, reduce body fat %' },
  { value: 'gain_weight',       label: 'Gain Weight',        desc: 'Add mass, increase caloric surplus' },
  { value: 'build_muscle',      label: 'Build Muscle',       desc: 'Hypertrophy training, strength gains' },
  { value: 'improve_endurance', label: 'Improve Endurance',  desc: 'Cardio capacity, stamina, VO2 max' },
  { value: 'general_wellness',  label: 'General Wellness',   desc: 'Balance, flexibility, overall health' },
] as const

const LEVELS = [
  { value: 'beginner',     label: 'Beginner',     desc: 'New to structured training (<1 year)' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Consistent training (1-3 years)' },
  { value: 'advanced',     label: 'Advanced',     desc: 'Experienced athlete (3+ years)' },
] as const

const DURATIONS = [
  { value: 1, label: '1 Month',   desc: 'Kickstart & reset' },
  { value: 3, label: '3 Months',  desc: 'Real, visible results' },
  { value: 6, label: '6 Months',  desc: 'Full transformation' },
] as const

const ALLERGIES = [
  { value: 'nuts',      label: 'Nuts' },
  { value: 'dairy',     label: 'Dairy' },
  { value: 'gluten',    label: 'Gluten' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'eggs',      label: 'Eggs' },
  { value: 'soy',       label: 'Soy' },
] as const

const PROTEINS = [
  { value: 'chicken',       label: 'Chicken' },
  { value: 'beef',          label: 'Beef' },
  { value: 'fish',          label: 'Fish' },
  { value: 'eggs',          label: 'Eggs' },
  { value: 'tofu_tempeh',   label: 'Tofu / Tempeh' },
  { value: 'lentils_beans', label: 'Lentils / Beans' },
  { value: 'dairy',         label: 'Dairy (yogurt, cheese)' },
  { value: 'pork',          label: 'Pork' },
] as const

const REGIONS = [
  { value: '',              label: 'Prefer not to say' },
  { value: 'north_america', label: 'North America' },
  { value: 'europe',        label: 'Europe' },
  { value: 'west_africa',   label: 'West Africa' },
  { value: 'east_africa',   label: 'East Africa' },
  { value: 'south_asia',    label: 'South Asia' },
  { value: 'east_asia',     label: 'East Asia' },
  { value: 'latin_america', label: 'Latin America' },
  { value: 'middle_east',   label: 'Middle East' },
  { value: 'caribbean',     label: 'Caribbean' },
] as const

export default function NewPlanWizard() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<FormData>({
    age: '', weight: '', weight_unit: 'kg',
    height: '', height_unit: 'cm',
    goal_types: [], fitness_level: '',
    allergies: [], allergy_other: '',
    preferred_proteins: [], region: '',
    duration_months: null,
  })

  const steps = ['Personal Info', 'Goals', 'Dietary Preferences', 'Fitness Level', 'Duration', 'Review & Submit']

  const canNext = () => {
    if (step === 1) return form.age && form.weight && form.height
    if (step === 2) return form.goal_types.length > 0
    if (step === 3) return true // all optional
    if (step === 4) return form.fitness_level !== ''
    if (step === 5) return form.duration_months !== null
    return true
  }

  const toggleChip = <T extends string>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const allAllergies = [...form.allergies]
      if (form.allergy_other.trim()) allAllergies.push(form.allergy_other.trim())

      const { data: profileData, error: profileError } = await supabase.functions.invoke('update-profile', {
        body: {
          age: parseInt(form.age),
          weight: parseFloat(form.weight),
          weight_unit: form.weight_unit,
          height: parseFloat(form.height),
          height_unit: form.height_unit,
          fitness_level: form.fitness_level,
          goal_type: form.goal_types,
          allergies: allAllergies.join(','),
          preferred_proteins: form.preferred_proteins.join(','),
          region: form.region,
        },
      })
      if (profileError) {
        const ctx = profileError.context
        const body = ctx instanceof Response ? await ctx.json().catch(() => null) : null
        throw new Error(body?.error || 'Failed to save profile')
      }
      const { profile } = profileData

      const { data: planData, error: planError } = await supabase.functions.invoke('submit-plan', {
        body: {
          fitness_profile_id: profile.id,
          duration_months: form.duration_months,
        },
      })
      if (planError) {
        const ctx = planError.context
        const body = ctx instanceof Response ? await ctx.json().catch(() => null) : null
        throw new Error(body?.error || 'Failed to submit plan')
      }
      const { plan_id } = planData

      toast.success('Plan saved! Proceed to payment to generate your personalized plan.')
      router.push(`/dashboard/plans/${plan_id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const allAllergiesForReview = [...form.allergies.map(a => ALLERGIES.find(x => x.value === a)?.label ?? a)]
  if (form.allergy_other.trim()) allAllergiesForReview.push(form.allergy_other.trim())

  return (
    <div className="glass rounded-2xl overflow-hidden border border-border/50">
      {/* Step indicator */}
      <div className="p-6 border-b border-border/40 bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <motion.div
                animate={{
                  backgroundColor: i + 1 < step ? 'rgb(80,45,85)' : i + 1 === step ? 'transparent' : 'transparent',
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i + 1 < step
                    ? 'bg-plum dark:bg-peach text-linen dark:text-plum-black'
                    : i + 1 === step
                    ? 'border-2 border-plum dark:border-peach text-plum dark:text-peach'
                    : 'border border-border text-muted-foreground'
                }`}
              >
                {i + 1 < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </motion.div>
              {i < steps.length - 1 && (
                <div className={`h-px w-6 sm:w-8 mx-0.5 transition-all duration-500 ${
                  i + 1 < step ? 'bg-plum dark:bg-peach' : 'bg-border'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">Step {step} of {steps.length}</div>
        <h2 className="font-semibold text-base mt-0.5">{steps[step - 1]}</h2>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="p-6"
        >
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Age</label>
                <input
                  type="number" min={10} max={100} placeholder="e.g. 28"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Weight</label>
                <div className="flex gap-2">
                  <input
                    type="number" min={20} max={300} placeholder="e.g. 75"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    className="input-field flex-1"
                  />
                  <div className="flex glass rounded-lg overflow-hidden border border-border/50">
                    {(['kg', 'lbs'] as WeightUnit[]).map((u) => (
                      <button
                        key={u} type="button"
                        onClick={() => setForm({ ...form, weight_unit: u })}
                        className={`px-4 py-3 text-sm font-medium transition-all ${
                          form.weight_unit === u
                            ? 'bg-plum dark:bg-peach text-linen dark:text-plum-black'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Height</label>
                <div className="flex gap-2">
                  <input
                    type="number" min={100} max={250}
                    placeholder={form.height_unit === 'cm' ? 'e.g. 175' : 'e.g. 5.9'}
                    value={form.height}
                    onChange={(e) => setForm({ ...form, height: e.target.value })}
                    className="input-field flex-1"
                  />
                  <div className="flex glass rounded-lg overflow-hidden border border-border/50">
                    {(['cm', 'ft'] as HeightUnit[]).map((u) => (
                      <button
                        key={u} type="button"
                        onClick={() => setForm({ ...form, height_unit: u })}
                        className={`px-4 py-3 text-sm font-medium transition-all ${
                          form.height_unit === u
                            ? 'bg-plum dark:bg-peach text-linen dark:text-plum-black'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Goals (multi-select, 1-3) */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">
                What are your fitness goals? Pick one or up to {MAX_GOALS}.
              </p>
              {GOALS.map((g) => {
                const selected = form.goal_types.includes(g.value as GoalType)
                const atMax = form.goal_types.length >= MAX_GOALS && !selected
                return (
                  <motion.button
                    key={g.value} type="button" whileHover={atMax ? {} : { scale: 1.01 }} whileTap={atMax ? {} : { scale: 0.99 }}
                    onClick={() => {
                      if (selected) {
                        setForm({ ...form, goal_types: form.goal_types.filter(t => t !== g.value) })
                      } else if (!atMax) {
                        setForm({ ...form, goal_types: [...form.goal_types, g.value as GoalType] })
                      }
                    }}
                    disabled={atMax}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selected
                        ? 'border-plum dark:border-peach bg-plum/8 dark:bg-peach/8'
                        : atMax
                        ? 'border-border/30 bg-muted/10 opacity-50 cursor-not-allowed'
                        : 'border-border/50 hover:border-mauve/40 bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{g.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{g.desc}</div>
                      </div>
                      {selected && (
                        <Check className="w-4 h-4 text-plum dark:text-peach shrink-0" />
                      )}
                    </div>
                  </motion.button>
                )
              })}
              {form.goal_types.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  {form.goal_types.length}/{MAX_GOALS} selected — first goal is your primary focus
                </p>
              )}
            </div>
          )}

          {/* Step 3: Dietary Preferences (all optional) */}
          {step === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                These help us tailor your nutrition plan. All fields are optional — skip anything that doesn't apply.
              </p>

              {/* Allergies */}
              <div>
                <label className="text-sm font-medium mb-2 block">Allergies / Intolerances</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {ALLERGIES.map((a) => {
                    const selected = form.allergies.includes(a.value)
                    return (
                      <button
                        key={a.value} type="button"
                        onClick={() => setForm({ ...form, allergies: toggleChip(form.allergies, a.value) })}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          selected
                            ? 'border-plum dark:border-peach bg-plum/10 dark:bg-peach/10 text-plum dark:text-peach'
                            : 'border-border/50 text-muted-foreground hover:border-mauve/40'
                        }`}
                      >
                        {a.label}
                        {selected && <X className="w-3 h-3" />}
                      </button>
                    )
                  })}
                </div>
                <input
                  type="text" placeholder="Other allergies (e.g. peanuts, sesame)"
                  value={form.allergy_other}
                  onChange={(e) => setForm({ ...form, allergy_other: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              {/* Preferred Proteins */}
              <div>
                <label className="text-sm font-medium mb-2 block">Preferred Proteins</label>
                <p className="text-xs text-muted-foreground mb-2">Select the proteins you enjoy eating most</p>
                <div className="flex flex-wrap gap-2">
                  {PROTEINS.map((p) => {
                    const selected = form.preferred_proteins.includes(p.value)
                    return (
                      <button
                        key={p.value} type="button"
                        onClick={() => setForm({ ...form, preferred_proteins: toggleChip(form.preferred_proteins, p.value) })}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          selected
                            ? 'border-plum dark:border-peach bg-plum/10 dark:bg-peach/10 text-plum dark:text-peach'
                            : 'border-border/50 text-muted-foreground hover:border-mauve/40'
                        }`}
                      >
                        {p.label}
                        {selected && <X className="w-3 h-3" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Region */}
              <div>
                <label className="text-sm font-medium mb-2 block">Region</label>
                <p className="text-xs text-muted-foreground mb-2">Helps us suggest locally available foods</p>
                <select
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className="input-field text-sm"
                >
                  {REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 4: Fitness Level */}
          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">What is your current fitness level?</p>
              {LEVELS.map((l) => (
                <motion.button
                  key={l.value} type="button" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={() => setForm({ ...form, fitness_level: l.value as FitnessLevel })}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    form.fitness_level === l.value
                      ? 'border-plum dark:border-peach bg-plum/8 dark:bg-peach/8'
                      : 'border-border/50 hover:border-mauve/40 bg-muted/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{l.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{l.desc}</div>
                    </div>
                    {form.fitness_level === l.value && (
                      <Check className="w-4 h-4 text-plum dark:text-peach shrink-0" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {/* Step 5: Duration */}
          {step === 5 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">How long do you want your plan?</p>
              {DURATIONS.map((d) => (
                <motion.button
                  key={d.value} type="button" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={() => setForm({ ...form, duration_months: d.value as Duration })}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    form.duration_months === d.value
                      ? 'border-plum dark:border-peach bg-plum/8 dark:bg-peach/8'
                      : 'border-border/50 hover:border-mauve/40 bg-muted/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{d.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{d.desc}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-plum dark:text-peach font-bold">{PRICING[d.value]} GEN</div>
                      <div className="text-xs text-muted-foreground">tokens</div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {/* Step 6: Review */}
          {step === 6 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">Review your profile before submitting to GenLayer.</p>
              <div className="space-y-0 rounded-xl overflow-hidden border border-border/40">
                {[
                  { label: 'Age',           value: `${form.age} years` },
                  { label: 'Weight',        value: `${form.weight} ${form.weight_unit}` },
                  { label: 'Height',        value: `${form.height} ${form.height_unit}` },
                  { label: 'Goal(s)',       value: form.goal_types.map(g => GOALS.find(x => x.value === g)?.label).filter(Boolean).join(', ') },
                  { label: 'Fitness Level', value: LEVELS.find(l => l.value === form.fitness_level)?.label ?? '' },
                  { label: 'Allergies',     value: allAllergiesForReview.length > 0 ? allAllergiesForReview.join(', ') : 'None' },
                  { label: 'Proteins',      value: form.preferred_proteins.length > 0 ? form.preferred_proteins.map(p => PROTEINS.find(x => x.value === p)?.label).filter(Boolean).join(', ') : 'No preference' },
                  { label: 'Region',        value: REGIONS.find(r => r.value === form.region)?.label ?? 'Not specified' },
                  { label: 'Plan Duration', value: `${form.duration_months} Month${form.duration_months !== 1 ? 's' : ''}` },
                ].map((row, i) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between px-4 py-3 text-sm ${
                      i % 2 === 0 ? 'bg-muted/20' : 'bg-transparent'
                    }`}
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium text-right max-w-[60%]">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4 border border-mauve/30 bg-mauve/5 dark:bg-peach/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Cost to unlock</span>
                  <div className="text-right">
                    <div className="text-plum dark:text-peach font-bold text-xl">
                      {PRICING[form.duration_months!]} GEN
                    </div>
                    <div className="text-xs text-muted-foreground">paid before generation</div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Your profile will be saved and you'll be directed to the payment page. Once you pay, GenLayer validators will generate your personalized plan (30s-2min).
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="p-6 border-t border-border/40 flex gap-3">
        {step > 1 && (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-2 glass px-4 py-2.5 rounded-xl text-sm font-medium border border-border/50 hover:border-mauve/40 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </motion.button>
        )}
        <div className="flex-1" />
        <motion.button
          whileHover={canNext() ? { scale: 1.02 } : {}}
          whileTap={canNext() ? { scale: 0.97 } : {}}
          type="button"
          onClick={step < 6 ? () => setStep(step + 1) : handleSubmit}
          disabled={!canNext() || submitting}
          className="flex items-center gap-2 btn-primary px-6 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {step < 6 ? (
            <>Next <ChevronRight className="w-4 h-4" /></>
          ) : submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving Plan...</>
          ) : (
            <>Save & Continue to Payment <ChevronRight className="w-4 h-4" /></>
          )}
        </motion.button>
      </div>
    </div>
  )
}
