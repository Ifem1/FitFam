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
      'Pay with GEN tokens to unlock your full workout + nutrition plan. It\'s stored on-chain and yours to keep.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-[#00FF88] text-sm font-medium uppercase tracking-widest">Process</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-4">How FitFam Works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Three steps from profile to a verified, personalized plan — powered by blockchain AI.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#00FF88]/30 to-transparent" />

          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="glass rounded-2xl p-8 relative group hover:border-[#00FF88]/30 transition-all"
            >
              {/* Step number */}
              <div className="absolute -top-4 left-8">
                <span className="glass px-3 py-1 rounded-full text-xs font-mono text-[#00FF88]">
                  {step.step}
                </span>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-[#00FF88]/10 flex items-center justify-center mb-6 group-hover:bg-[#00FF88]/20 transition-colors">
                <step.icon className="w-6 h-6 text-[#00FF88]" />
              </div>

              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
