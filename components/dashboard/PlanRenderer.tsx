'use client'

import { useState, useRef } from 'react'
import { Dumbbell, Apple, Target, Moon, Zap, ChevronDown, ChevronUp, Download, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [downloading, setDownloading] = useState(false)
  const pdfRef = useRef<HTMLDivElement>(null)

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const el = pdfRef.current
      if (!el) return

      el.style.display = 'block'

      const opts = {
        margin: [10, 10, 10, 10],
        filename: `FitFam-${durationMonths}Month-Plan.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (html2pdf() as any).set(opts).from(el).save()

      el.style.display = 'none'
    } catch {
      // fallback: window.print()
      window.print()
    } finally {
      setDownloading(false)
    }
  }

  const tabs = [
    { id: 'workouts',   label: 'Workouts',   icon: Dumbbell },
    { id: 'nutrition',  label: 'Nutrition',  icon: Apple },
    { id: 'milestones', label: 'Milestones', icon: Target },
    { id: 'recovery',   label: 'Recovery',   icon: Moon },
  ] as const

  return (
    <div className="space-y-6">
      {/* Summary */}
      {plan.summary && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 border border-mauve/30"
        >
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
            <Zap className="w-5 h-5 text-plum dark:text-peach" fill="currentColor" />
            Your Plan Summary
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{plan.summary}</p>
        </motion.div>
      )}

      {/* Tab nav + download */}
      <div className="flex items-center gap-3">
        <div className="glass rounded-xl p-1 flex gap-1 border border-border/40 flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-plum dark:bg-peach text-linen dark:text-plum-black shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="shrink-0 glass flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border/40 hover:border-mauve/40 transition-all disabled:opacity-50"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span className="hidden sm:inline">PDF</span>
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {/* Workouts tab */}
          {activeTab === 'workouts' && (
            <div className="space-y-4">
              {plan.weekly_schedule?.map((week, wIdx) => (
                <div key={wIdx} className="glass rounded-2xl overflow-hidden border border-border/40">
                  <button
                    className="w-full flex items-center justify-between p-5 hover:bg-plum/5 dark:hover:bg-white/5 transition-all"
                    onClick={() => setExpandedWeek(expandedWeek === wIdx ? null : wIdx)}
                  >
                    <div className="text-left">
                      <div className="font-semibold">Week {week.week_number}</div>
                      {week.theme && <div className="text-xs text-mauve dark:text-peach mt-0.5">{week.theme}</div>}
                    </div>
                    {expandedWeek === wIdx
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    }
                  </button>

                  {expandedWeek === wIdx && (
                    <div className="px-5 pb-5 space-y-4 border-t border-border/40 pt-4">
                      {week.schedule?.map((day, dIdx) => (
                        <div key={dIdx}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-plum dark:bg-peach" />
                            <span className="font-medium text-sm">{day.day}</span>
                            <span className="text-xs text-muted-foreground">— {day.focus}</span>
                          </div>
                          {day.exercises?.length > 0 ? (
                            <div className="space-y-2 ml-4">
                              {day.exercises.map((ex, eIdx) => (
                                <div key={eIdx} className="bg-muted/30 border border-border/30 rounded-xl p-3">
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
              <div className="glass rounded-2xl p-6 border border-border/40">
                <h3 className="font-bold mb-4">Daily Macro Targets</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Calories', value: plan.nutrition_guidelines.daily_calories, unit: 'kcal', color: 'text-plum dark:text-peach' },
                    { label: 'Protein',  value: plan.nutrition_guidelines.protein_g,      unit: 'g',    color: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Carbs',    value: plan.nutrition_guidelines.carbs_g,        unit: 'g',    color: 'text-amber-600 dark:text-amber-400' },
                    { label: 'Fats',     value: plan.nutrition_guidelines.fats_g,         unit: 'g',    color: 'text-orange-500 dark:text-orange-400' },
                  ].map((macro) => (
                    <div key={macro.label} className="bg-muted/30 rounded-xl p-4 text-center border border-border/30">
                      <div className={`text-2xl font-bold ${macro.color}`}>{macro.value}</div>
                      <div className="text-xs text-muted-foreground">{macro.unit}</div>
                      <div className="text-xs font-medium mt-1">{macro.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {plan.nutrition_guidelines.foods_to_eat && (
                  <div className="glass rounded-2xl p-5 border border-border/40">
                    <h4 className="font-semibold text-sm text-plum dark:text-peach mb-3">✓ Foods to Eat</h4>
                    <ul className="space-y-1.5">
                      {plan.nutrition_guidelines.foods_to_eat.map((f, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-mauve dark:text-peach mt-0.5">•</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {plan.nutrition_guidelines.foods_to_avoid && (
                  <div className="glass rounded-2xl p-5 border border-border/40">
                    <h4 className="font-semibold text-sm text-destructive mb-3">✕ Foods to Avoid</h4>
                    <ul className="space-y-1.5">
                      {plan.nutrition_guidelines.foods_to_avoid.map((f, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-destructive mt-0.5">•</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {plan.nutrition_guidelines.meal_timing && (
                <div className="glass rounded-2xl p-5 border border-border/40">
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
            <div className="glass rounded-2xl p-6 space-y-4 border border-border/40">
              <h3 className="font-bold">Progress Milestones</h3>
              {plan.milestones?.map((m, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-plum to-mauve dark:from-mauve dark:to-peach flex items-center justify-center text-xs font-bold text-linen">
                      {i + 1}
                    </div>
                    {i < (plan.milestones?.length ?? 0) - 1 && (
                      <div className="w-px flex-1 bg-mauve/20 dark:bg-peach/20 mt-2" />
                    )}
                  </div>
                  <div className="pb-4">
                    <div className="text-xs text-mauve dark:text-peach font-medium mb-1">
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
                <div className="glass rounded-2xl p-6 border border-border/40">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Moon className="w-5 h-5 text-mauve dark:text-peach" />
                    Recovery Guidance
                  </h3>
                  <ul className="space-y-3">
                    {plan.recovery_guidance.map((r, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-3 leading-relaxed">
                        <span className="text-plum dark:text-peach font-bold mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {plan.motivation_tips && (
                <div className="glass rounded-2xl p-6 border border-border/40">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-plum dark:text-peach" fill="currentColor" />
                    Motivation & Consistency Tips
                  </h3>
                  <ul className="space-y-3">
                    {plan.motivation_tips.map((t, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-3 leading-relaxed">
                        <span className="text-mauve dark:text-peach shrink-0">→</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Hidden PDF content — all sections rendered for export */}
      <div ref={pdfRef} style={{ display: 'none' }}>
        <div style={{ fontFamily: 'system-ui, sans-serif', color: '#1a1a1a', padding: '20px', maxWidth: '700px' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>FitFam — {durationMonths}-Month Fitness Plan</h1>
          <hr style={{ margin: '12px 0', borderColor: '#ddd' }} />

          {plan.summary && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Plan Summary</h2>
              <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#444' }}>{plan.summary}</p>
            </div>
          )}

          {plan.weekly_schedule && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>Workout Schedule</h2>
              {plan.weekly_schedule.map((week, wIdx) => (
                <div key={wIdx} style={{ marginBottom: '16px', pageBreakInside: 'avoid' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                    Week {week.week_number}{week.theme ? ` — ${week.theme}` : ''}
                  </h3>
                  {week.schedule?.map((day, dIdx) => (
                    <div key={dIdx} style={{ marginBottom: '8px', marginLeft: '12px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600 }}>{day.day} — {day.focus}</p>
                      {day.exercises?.length > 0 ? (
                        <ul style={{ margin: '4px 0 0 16px', fontSize: '12px', color: '#555' }}>
                          {day.exercises.map((ex, eIdx) => (
                            <li key={eIdx} style={{ marginBottom: '2px' }}>
                              {ex.name}
                              {ex.sets ? ` — ${ex.sets} sets` : ''}
                              {ex.reps ? ` x ${ex.reps}` : ''}
                              {ex.duration ? ` (${ex.duration})` : ''}
                              {ex.rest ? ` | Rest: ${ex.rest}` : ''}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#888', marginLeft: '16px' }}>Rest Day</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {plan.nutrition_guidelines && (
            <div style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
              <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Nutrition Guidelines</h2>
              <p style={{ fontSize: '13px', color: '#444' }}>
                Daily Calories: {plan.nutrition_guidelines.daily_calories} kcal
                {' | '}Protein: {plan.nutrition_guidelines.protein_g}g
                {' | '}Carbs: {plan.nutrition_guidelines.carbs_g}g
                {' | '}Fats: {plan.nutrition_guidelines.fats_g}g
              </p>
              {plan.nutrition_guidelines.foods_to_eat && (
                <div style={{ marginTop: '8px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>Foods to Eat:</p>
                  <ul style={{ fontSize: '12px', color: '#555', margin: '4px 0 0 16px' }}>
                    {plan.nutrition_guidelines.foods_to_eat.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
              {plan.nutrition_guidelines.foods_to_avoid && (
                <div style={{ marginTop: '8px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>Foods to Avoid:</p>
                  <ul style={{ fontSize: '12px', color: '#555', margin: '4px 0 0 16px' }}>
                    {plan.nutrition_guidelines.foods_to_avoid.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
              {plan.nutrition_guidelines.meal_timing && (
                <div style={{ marginTop: '8px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>Meal Timing:</p>
                  <ul style={{ fontSize: '12px', color: '#555', margin: '4px 0 0 16px' }}>
                    {plan.nutrition_guidelines.meal_timing.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {plan.milestones && (
            <div style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
              <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Milestones</h2>
              {plan.milestones.map((m, i) => (
                <div key={i} style={{ marginBottom: '8px', marginLeft: '12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>
                    {m.week ? `Week ${m.week}` : m.month ? `Month ${m.month}` : `#${i + 1}`} — {m.title}
                  </p>
                  <p style={{ fontSize: '12px', color: '#555' }}>{m.description}</p>
                </div>
              ))}
            </div>
          )}

          {plan.recovery_guidance && (
            <div style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
              <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Recovery Guidance</h2>
              <ol style={{ fontSize: '12px', color: '#555', margin: '0 0 0 16px' }}>
                {plan.recovery_guidance.map((r, i) => <li key={i} style={{ marginBottom: '4px' }}>{r}</li>)}
              </ol>
            </div>
          )}

          {plan.motivation_tips && (
            <div style={{ pageBreakInside: 'avoid' }}>
              <h2 style={{ fontSize: '16px', marginBottom: '8px' }}>Motivation Tips</h2>
              <ul style={{ fontSize: '12px', color: '#555', margin: '0 0 0 16px' }}>
                {plan.motivation_tips.map((t, i) => <li key={i} style={{ marginBottom: '4px' }}>{t}</li>)}
              </ul>
            </div>
          )}

          <hr style={{ margin: '20px 0 8px', borderColor: '#ddd' }} />
          <p style={{ fontSize: '10px', color: '#999', textAlign: 'center' }}>
            Generated by FitFam — Powered by GenLayer
          </p>
        </div>
      </div>
    </div>
  )
}
