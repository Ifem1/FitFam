'use client'

import { useState } from 'react'
import { Dumbbell, Apple, Target, Moon, Zap, ChevronDown, ChevronUp } from 'lucide-react'

interface Exercise {
  name: string
  sets?: number
  reps?: string
  duration?: string
  rest?: string
  notes?: string
}

interface DaySchedule {
  day: string
  focus: string
  exercises: Exercise[]
}

interface Week {
  week_number: number
  theme?: string
  schedule: DaySchedule[]
}

interface NutritionGuide {
  daily_calories?: number
  protein_g?: number
  carbs_g?: number
  fats_g?: number
  meal_timing?: string[]
  foods_to_eat?: string[]
  foods_to_avoid?: string[]
  hydration?: string
}

interface Milestone {
  week?: number
  month?: number
  title: string
  description: string
}

interface PlanContent {
  summary?: string
  weekly_schedule?: Week[]
  nutrition_guidelines?: NutritionGuide
  milestones?: Milestone[]
  recovery_guidance?: string[]
  motivation_tips?: string[]
}

export default function PlanRenderer({
  content,
  durationMonths,
}: {
  content: Record<string, unknown>
  durationMonths: number
}) {
  const plan = content as PlanContent
  const [activeTab, setActiveTab] = useState<'workouts' | 'nutrition' | 'milestones' | 'recovery'>('workouts')
  const [expandedWeek, setExpandedWeek] = useState<number | null>(0)

  const tabs = [
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'nutrition', label: 'Nutrition', icon: Apple },
    { id: 'milestones', label: 'Milestones', icon: Target },
    { id: 'recovery', label: 'Recovery', icon: Moon },
  ] as const

  return (
    <div className="space-y-6">
      {/* Summary */}
      {plan.summary && (
        <div className="glass rounded-2xl p-6 border border-[#00FF88]/20">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#00FF88]" />
            Your Plan Summary
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{plan.summary}</p>
        </div>
      )}

      {/* Tab nav */}
      <div className="glass rounded-xl p-1 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[#00FF88] text-black'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Workouts tab */}
      {activeTab === 'workouts' && (
        <div className="space-y-4">
          {plan.weekly_schedule?.map((week, wIdx) => (
            <div key={wIdx} className="glass rounded-2xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all"
                onClick={() => setExpandedWeek(expandedWeek === wIdx ? null : wIdx)}
              >
                <div className="text-left">
                  <div className="font-semibold">Week {week.week_number}</div>
                  {week.theme && <div className="text-xs text-[#00FF88] mt-0.5">{week.theme}</div>}
                </div>
                {expandedWeek === wIdx ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {expandedWeek === wIdx && (
                <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
                  {week.schedule?.map((day, dIdx) => (
                    <div key={dIdx}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-[#00FF88]" />
                        <span className="font-medium text-sm">{day.day}</span>
                        <span className="text-xs text-muted-foreground">— {day.focus}</span>
                      </div>
                      {day.exercises?.length > 0 ? (
                        <div className="space-y-2 ml-4">
                          {day.exercises.map((ex, eIdx) => (
                            <div key={eIdx} className="bg-white/5 rounded-lg p-3">
                              <div className="font-medium text-sm">{ex.name}</div>
                              <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                {ex.sets && <span>{ex.sets} sets</span>}
                                {ex.reps && <span>{ex.reps} reps</span>}
                                {ex.duration && <span>{ex.duration}</span>}
                                {ex.rest && <span>Rest: {ex.rest}</span>}
                              </div>
                              {ex.notes && <p className="text-xs text-muted-foreground mt-1 italic">{ex.notes}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground ml-4">Rest Day — focus on recovery and light stretching.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Nutrition tab */}
      {activeTab === 'nutrition' && plan.nutrition_guidelines && (
        <div className="space-y-4">
          {/* Macros */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-bold mb-4">Daily Macro Targets</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Calories', value: plan.nutrition_guidelines.daily_calories, unit: 'kcal', color: 'text-[#00FF88]' },
                { label: 'Protein', value: plan.nutrition_guidelines.protein_g, unit: 'g', color: 'text-blue-400' },
                { label: 'Carbs', value: plan.nutrition_guidelines.carbs_g, unit: 'g', color: 'text-yellow-400' },
                { label: 'Fats', value: plan.nutrition_guidelines.fats_g, unit: 'g', color: 'text-orange-400' },
              ].map((macro) => (
                <div key={macro.label} className="bg-white/5 rounded-xl p-4 text-center">
                  <div className={`text-2xl font-bold ${macro.color}`}>{macro.value}</div>
                  <div className="text-xs text-muted-foreground">{macro.unit}</div>
                  <div className="text-xs font-medium mt-1">{macro.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Foods */}
          <div className="grid sm:grid-cols-2 gap-4">
            {plan.nutrition_guidelines.foods_to_eat && (
              <div className="glass rounded-2xl p-5">
                <h4 className="font-semibold text-sm text-[#00FF88] mb-3">✓ Foods to Eat</h4>
                <ul className="space-y-1.5">
                  {plan.nutrition_guidelines.foods_to_eat.map((f, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-[#00FF88] mt-0.5">•</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {plan.nutrition_guidelines.foods_to_avoid && (
              <div className="glass rounded-2xl p-5">
                <h4 className="font-semibold text-sm text-red-400 mb-3">✕ Foods to Avoid</h4>
                <ul className="space-y-1.5">
                  {plan.nutrition_guidelines.foods_to_avoid.map((f, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Meal timing */}
          {plan.nutrition_guidelines.meal_timing && (
            <div className="glass rounded-2xl p-5">
              <h4 className="font-semibold text-sm mb-3">Meal Timing</h4>
              <ul className="space-y-2">
                {plan.nutrition_guidelines.meal_timing.map((t, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Milestones tab */}
      {activeTab === 'milestones' && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-bold">Progress Milestones</h3>
          {plan.milestones?.map((m, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#00FF88]/20 flex items-center justify-center text-xs font-bold text-[#00FF88]">
                  {i + 1}
                </div>
                {i < (plan.milestones?.length ?? 0) - 1 && (
                  <div className="w-px flex-1 bg-[#00FF88]/20 mt-2" />
                )}
              </div>
              <div className="pb-4">
                <div className="text-xs text-[#00FF88] font-medium mb-1">
                  {m.week ? `Week ${m.week}` : m.month ? `Month ${m.month}` : ''}
                </div>
                <div className="font-semibold text-sm">{m.title}</div>
                <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{m.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recovery tab */}
      {activeTab === 'recovery' && (
        <div className="space-y-4">
          {plan.recovery_guidance && (
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Moon className="w-5 h-5 text-[#00FF88]" />
                Recovery Guidance
              </h3>
              <ul className="space-y-3">
                {plan.recovery_guidance.map((r, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-3 leading-relaxed">
                    <span className="text-[#00FF88] font-bold mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {plan.motivation_tips && (
            <div className="glass rounded-2xl p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#00FF88]" />
                Motivation & Consistency Tips
              </h3>
              <ul className="space-y-3">
                {plan.motivation_tips.map((t, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-3 leading-relaxed">
                    <span className="text-[#00FF88] shrink-0">→</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
