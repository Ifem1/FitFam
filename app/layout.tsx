import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { ThemeProvider } from 'next-themes'

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast: 'glass border border-border text-foreground',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
