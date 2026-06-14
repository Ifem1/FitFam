'use client'

import Link from 'next/link'
import { Check, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

const plans = [
  {
    duration: '1 Month',
    price: 5,
    description: 'Perfect for a focused kickstart or body reset.',
    features: [
      '4-week workout schedule',
      'Daily nutrition guidelines',
      'Weekly milestones',
      'Recovery & rest guidance',
      'Motivational framework',
      'On-chain plan storage',
    ],
    popular: false,
  },
  {
    duration: '3 Months',
    price: 12,
    description: 'The most popular choice for real, visible results.',
    features: [
      'Everything in 1 Month',
      '12-week progressive plan',
      'Advanced macro cycling',
      'Monthly progression check-ins',
      'Plateau-breaking protocols',
      'Priority consensus speed',
    ],
    popular: true,
  },
  {
    duration: '6 Months',
    price: 20,
    description: 'Full body transformation with long-term structure.',
    features: [
      'Everything in 3 Months',
      '24-week full transformation',
      'Seasonal nutrition adjustments',
      'Strength + endurance phases',
      'Mind-muscle connection tips',
      'Lifetime plan access',
    ],
    popular: false,
  },
]

export default function PricingCards() {
  return (
    <section id="pricing" className="py-24 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(147,80,115,0.1) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-mauve text-sm font-semibold uppercase tracking-widest"
          >
            Pricing
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold mt-2 mb-4"
          >
            Simple, Token-Based Pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-xl mx-auto"
          >
            Pay with GEN tokens on StudioNet. Prices are enforced by the Intelligent Contract — transparent and immutable.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.duration}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: -8, transition: { duration: 0.25 } }}
              className={`relative rounded-2xl p-8 flex flex-col transition-all duration-300 ${
                plan.popular
                  ? 'border-2 border-mauve/60 bg-gradient-to-b from-plum/10 to-mauve/5 dark:from-peach/10 dark:to-mauve/10 glow'
                  : 'glass border border-border/50 hover:border-mauve/30'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <motion.span
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="bg-gradient-to-r from-plum to-mauve dark:from-peach dark:to-mauve text-linen dark:text-plum-black text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1 shadow-lg"
                  >
                    <Zap className="w-3 h-3" fill="currentColor" /> Most Popular
                  </motion.span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-muted-foreground mb-1">{plan.duration}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="text-mauve dark:text-peach font-semibold text-lg">GEN</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-mauve dark:text-peach mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/signup"
                  className={`w-full py-3 rounded-xl font-semibold text-center text-sm transition-all block ${
                    plan.popular
                      ? 'btn-primary glow-sm'
                      : 'glass hover:bg-plum/10 dark:hover:bg-white/10 text-foreground border border-border/50'
                  }`}
                >
                  Get {plan.duration} Plan
                </Link>
              </motion.div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          Prices enforced on-chain. GEN tokens required on StudioNet.
        </motion.p>
      </div>
    </section>
  )
}
