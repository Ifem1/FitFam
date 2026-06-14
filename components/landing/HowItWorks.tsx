'use client'

import { ClipboardList, BrainCircuit, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'

const steps = [
  {
    icon: ClipboardList,
    step: '01',
    title: 'Submit Your Profile',
    description:
      'Fill out your age, weight, height, fitness level, and goal. Choose a 1, 3, or 6-month plan duration.',
  },
  {
    icon: BrainCircuit,
    step: '02',
    title: 'AI Validates Your Plan',
    description:
      'GenLayer Intelligent Contracts use LLM capabilities with multi-validator consensus to generate and verify your personalized plan.',
  },
  {
    icon: Trophy,
    step: '03',
    title: 'Receive & Own Your Plan',
    description:
      "Pay with GEN tokens to unlock your full workout + nutrition plan. It's stored on-chain and yours to keep.",
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 relative">
      {/* Subtle section gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-plum/5 dark:via-plum-card/30 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-mauve text-sm font-semibold uppercase tracking-widest"
          >
            Process
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold mt-2 mb-4"
          >
            How FitFam Works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-xl mx-auto"
          >
            Three steps from profile to a verified, personalized plan — powered by blockchain AI.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-mauve/40 to-transparent" />

          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.15, ease: 'easeOut' }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="glass rounded-2xl p-8 relative group border border-border/50 hover:border-mauve/40 transition-all duration-300"
            >
              {/* Step badge */}
              <div className="absolute -top-4 left-8">
                <span className="glass px-3 py-1 rounded-full text-xs font-mono text-mauve border border-mauve/30">
                  {step.step}
                </span>
              </div>

              {/* Icon */}
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="w-12 h-12 rounded-xl bg-plum/10 dark:bg-peach/10 flex items-center justify-center mb-6 group-hover:bg-mauve/15 transition-colors"
              >
                <step.icon className="w-6 h-6 text-plum dark:text-peach" />
              </motion.div>

              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
