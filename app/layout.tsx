import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'FitFam — AI-Powered Fitness Plans on GenLayer',
  description:
    'Get a personalized AI-generated fitness and nutrition plan, validated by GenLayer consensus. Pay with GEN tokens, own your results on-chain.',
  keywords: ['fitness', 'AI', 'GenLayer', 'blockchain', 'nutrition', 'workout'],
  openGraph: {
    title: 'FitFam — AI-Powered Fitness Plans on GenLayer',
    description: 'Personalized fitness plans powered by GenLayer Intelligent Contracts.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(0 0% 6%)',
              border: '1px solid hsl(0 0% 12%)',
              color: 'hsl(0 0% 98%)',
            },
          }}
        />
      </body>
    </html>
  )
}
