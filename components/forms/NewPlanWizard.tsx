'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'

type WeightUnit = 'kg' | 'lbs'
type HeightUnit = 'cm' | 'ft'
type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'
type GoalType = 'lose_weight' | 'gain_weight' | 'build_muscle' | 'improve_endurance' | 'general_wellness'
type Duration = 1 | 3 | 6

interface FormData {
  age: string
  weight: string
  weight_unit: WeightUnit
  height: string
  height_unit: HeightUnit
  goal_type: GoalType | ''
  fitness_level: FitnessLevel | ''
  duration_months: Duration | null
}

const PRICING: Record<number, number> = { 1: 5, 3: 12, 6: 20 }

const GOALS = [
  { value: 'lose_weight', label: 'Lose Weight', desc: 'Burn fat, lean out, reduce body fat %' },
  { value: 'gain_weight', label: 'Gain Weight', desc: 'Add mass, increase caloric surplus' },
  { value: 'build_muscle', label: 'Build Muscle', desc: 'Hypertrophy training, strength gains' },
  { value: 'improve_endurance', label: 'Improve Endurance', desc: 'Cardio capacity, stamina, VO2 max' },
  { value: 'general_wellness', label: 'General Wellness', desc: 'Balance, flexibility, overall health' },
] as const

const LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: 'New to structured training (<1 year)' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Consistent training (1-3 years)' },
  { value: 'advanced', label: 'Advanced', desc: 'Experienced athlete (3+ years)' },
] as const

const DURATIONS = [
  { value: 1, label: '1 Month', desc: 'Kickstart & reset' },
  { value: 3, label: '3 Months', desc: 'Real, visible results' },
  { value: 6, label: '6 Months', desc: 'Full transformation' },
] as const

export default function NewPlanWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<FormData>({
    age: '',
    weight: '',
    weight_unit: 'kg',
    height: '',
    height_unit: 'cm',
    goal_type: '',
    fitness_level: '',
    duration_months: null,
  })

  const steps = ['Personal Info', 'Goal', 'Fitness Level', 'Duration', 'Review & Submit']

  const canNext = () => {
    if (step === 1) return form.age && form.weight && form.height
    if (step === 2) return form.goal_type !== ''
    if (step === 3) return form.fitness_level !== ''
    if (step === 4) return form.duration_months !== null
    return true
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // First save fitness profile
      const profileRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-profile`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            age: parseInt(form.age),
            weight: parseFloat(form.weight),
            weight_unit: form.weight_unit,
            height: parseFloat(form.height),
            height_unit: form.height_unit,
            fitness_level: form.fitness_level,
            goal_type: form.goal_type,
          }),
        }
      )
      if (!profileRes.ok) throw new Error('Failed to save profile')
      const { profile } = await profileRes.json()

      // Then submit plan to GenLayer
      const planRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-plan`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fitness_profile_id: profile.id,
            duration_months: form.duration_months,
          }),
        }
      )
      if (!planRes.ok) {
        const err = await planRes.json()
        throw new Error(err.message || 'Failed to submit plan')
      }
      const { plan_id } = await planRes.json()

      toast.success('Plan submitted! GenLayer validators are reaching consensus...')
      router.push(`/dashboard/plans/${plan_id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Progress bar */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i + 1 < step
                    ? 'bg-[#00FF88] text-black'
                    : i + 1 === step
                    ? 'border-2 border-[#00FF88] text-[#00FF88]'
                    : 'border border-white/20 text-muted-foreground'
                }`}
              >
                {i + 1 < step ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`h-px w-8 sm:w-12 mx-1 ${i + 1 < step ? 'bg-[#00FF88]' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>
        <h2 className="font-semibold">Step {step}: {steps[step - 1]}</h2>
      </div>

      {/* Step content */}
      <div className="p-6">
        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Age</label>
              <input
                type="number"
                min={10}
                max={100}
                placeholder="e.g. 28"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/30"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Weight</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={20}
                  max={300}
                  placeholder="e.g. 75"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/30"
                />
                <div className="flex glass rounded-lg overflow-hidden">
                  {(['kg', 'lbs'] as WeightUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setForm({ ...form, weight_unit: u })}
                      className={`px-4 py-3 text-sm font-medium transition-all ${
                        form.weight_unit === u ? 'bg-[#00FF88] text-black' : 'text-muted-foreground hover:text-white'
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
                  type="number"
                  min={100}
                  max={250}
                  placeholder={form.height_unit === 'cm' ? 'e.g. 175' : 'e.g. 5.9'}
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/30"
                />
                <div className="flex glass rounded-lg overflow-hidden">
                  {(['cm', 'ft'] as HeightUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setForm({ ...form, height_unit: u })}
                      className={`px-4 py-3 text-sm font-medium transition-all ${
                        form.height_unit === u ? 'bg-[#00FF88] text-black' : 'text-muted-foreground hover:text-white'
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

        {/* Step 2: Goal */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-2">What is your primary fitness goal?</p>
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setForm({ ...form, goal_type: g.value as GoalType })}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  form.goal_type === g.value
                    ? 'border-[#00FF88]/50 bg-[#00FF88]/5 text-white'
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                }`}
              >
                <div className="font-medium text-sm">{g.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{g.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Fitness Level */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-2">What is your current fitness level?</p>
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setForm({ ...form, fitness_level: l.value as FitnessLevel })}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  form.fitness_level === l.value
                    ? 'border-[#00FF88]/50 bg-[#00FF88]/5 text-white'
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                }`}
              >
                <div className="font-medium text-sm">{l.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{l.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* Step 4: Duration */}
        {step === 4 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-2">How long do you want your plan?</p>
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setForm({ ...form, duration_months: d.value as Duration })}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  form.duration_months === d.value
                    ? 'border-[#00FF88]/50 bg-[#00FF88]/5 text-white'
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{d.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{d.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#00FF88] font-bold">{PRICING[d.value]} GEN</div>
                    <div className="text-xs text-muted-foreground">tokens</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">Review your profile before submitting to GenLayer.</p>
            <div className="space-y-3">
              {[
                { label: 'Age', value: `${form.age} years` },
                { label: 'Weight', value: `${form.weight} ${form.weight_unit}` },
                { label: 'Height', value: `${form.height} ${form.height_unit}` },
                { label: 'Goal', value: GOALS.find(g => g.value === form.goal_type)?.label ?? '' },
                { label: 'Fitness Level', value: LEVELS.find(l => l.value === form.fitness_level)?.label ?? '' },
                { label: 'Plan Duration', value: `${form.duration_months} Month${form.duration_months !== 1 ? 's' : ''}` },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-white/10">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-medium">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="glass rounded-xl p-4 border border-[#00FF88]/20 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cost to unlock</span>
                <div className="text-right">
                  <div className="text-[#00FF88] font-bold text-xl">{PRICING[form.duration_months!]} GEN</div>
                  <div className="text-xs text-muted-foreground">paid after consensus</div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Your profile will be submitted to the GenLayer Intelligent Contract. Validators will reach consensus on your plan (30s–2min). You pay GEN tokens only after your plan is ready.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="p-6 border-t border-white/10 flex gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-2 glass px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        <div className="flex-1" />
        {step < 5 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-[#00E87A] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 bg-[#00FF88] text-black font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-[#00E87A] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting to GenLayer...</>
            ) : (
              <>Submit Plan to GenLayer <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
