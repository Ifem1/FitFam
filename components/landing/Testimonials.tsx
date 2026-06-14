'use client'

import { Star } from 'lucide-react'
import { motion } from 'framer-motion'

const testimonials = [
  {
    name: 'Marcus T.',
    handle: '@marcust_lifts',
    avatar: 'MT',
    rating: 5,
    text: "The 3-month plan was insane. Lost 12kg while gaining muscle. The fact that GenLayer validates the plan means I know it's not just random AI output — it's been verified.",
  },
  {
    name: 'Priya S.',
    handle: '@priya_wellness',
    avatar: 'PS',
    rating: 5,
    text: "As a beginner I was overwhelmed by fitness info online. FitFam gave me a clear, structured plan. 6 weeks in and I already feel stronger. The nutrition guide is 🔥",
  },
  {
    name: 'Jordan K.',
    handle: '@jk_endurance',
    avatar: 'JK',
    rating: 5,
    text: "Marathon runner here. The 6-month endurance plan had periodization I'd expect from a human coach. The consensus mechanism gives me confidence the plan is solid.",
  },
  {
    name: 'Aisha M.',
    handle: '@aisha_fit',
    avatar: 'AM',
    rating: 5,
    text: 'Loved how it asked for my exact goals. The build muscle plan had me on a progressive overload schedule week by week. My gym gains have been unreal since starting.',
  },
  {
    name: 'Cade R.',
    handle: '@cade_runs',
    avatar: 'CR',
    rating: 5,
    text: 'Paying with GEN tokens felt seamless. The wallet integration is smooth and the plan unlocked instantly. The recovery guidance alone was worth the 5 GEN.',
  },
  {
    name: 'Nina L.',
    handle: '@ninalifts',
    avatar: 'NL',
    rating: 5,
    text: "I've tried so many apps. FitFam is different — it's personalized, on-chain verified, and the plan layout is clean and easy to follow. Already bought my second plan.",
  },
]

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-mauve text-sm font-semibold uppercase tracking-widest"
          >
            Reviews
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold mt-2 mb-4"
          >
            Real People, Real Results
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-xl mx-auto"
          >
            Thousands of fitness journeys powered by AI-validated plans.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.handle}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="glass rounded-2xl p-6 flex flex-col gap-4 border border-border/40 hover:border-mauve/30 transition-all duration-300"
            >
              <div className="flex items-center gap-1">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-mauve dark:text-peach fill-mauve dark:fill-peach" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">"{t.text}"</p>
              <div className="flex items-center gap-3 mt-auto">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-plum to-mauve dark:from-mauve dark:to-peach flex items-center justify-center text-xs font-bold text-linen">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.handle}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
