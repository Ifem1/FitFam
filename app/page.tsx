import Hero from '@/components/landing/Hero'
import HowItWorks from '@/components/landing/HowItWorks'
import PricingCards from '@/components/landing/PricingCards'
import Testimonials from '@/components/landing/Testimonials'
import Footer from '@/components/landing/Footer'
import Navbar from '@/components/landing/Navbar'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background bg-grid-pattern">
      <Navbar />
      <Hero />
      <HowItWorks />
      <PricingCards />
      <Testimonials />
      <Footer />
    </main>
  )
}
