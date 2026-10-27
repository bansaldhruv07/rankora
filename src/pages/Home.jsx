import Hero from '../components/home/Hero'
import SubjectCards from '../components/home/SubjectCards'
import HowItWorks from '../components/home/HowItWorks'
import SampleNotes from '../components/home/SampleNotes'
import PyqPreview from '../components/home/PyqPreview'
import AnalyticsPreview from '../components/home/AnalyticsPreview'
import Benefits from '../components/home/Benefits'
import PricingPreview from '../components/home/PricingPreview'
import FaqSection from '../components/home/FaqSection'
import FinalCta from '../components/home/FinalCta'

export default function Home() {
  return (
    <>
      <Hero />
      <SubjectCards />
      <HowItWorks />
      <SampleNotes />
      <PyqPreview />
      <AnalyticsPreview />
      <Benefits />
      <PricingPreview />
      <FaqSection />
      <FinalCta />
    </>
  )
}