import Hero from '../components/home/Hero'
import TrustBar from '../components/home/TrustBar'
import Marquee from '../components/home/Marquee'
import Community from '../components/home/Community'
import FeaturedNotes from '../components/home/FeaturedNotes'
import Authors from '../components/home/Authors'
import SubjectCards from '../components/home/SubjectCards'
import HowItWorks from '../components/home/HowItWorks'
import Benefits from '../components/home/Benefits'
import Testimonials from '../components/home/Testimonials'
import PricingPreview from '../components/home/PricingPreview'
import FaqSection from '../components/home/FaqSection'
import FinalCta from '../components/home/FinalCta'

export default function Home() {
  return (
    <>
      <Hero />
      <TrustBar />
      <Marquee />
      <FeaturedNotes />
      <Authors />
      <SubjectCards />
      <HowItWorks />
      <Benefits />
      <Testimonials />
      <PricingPreview />
      <Community />
      <FaqSection />
      <FinalCta />
    </>
  )
}
