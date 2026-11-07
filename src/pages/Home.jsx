import Hero from "../components/home/Hero";
import ReviewsWall from "../components/home/ReviewsWall";
import Benefits from "../components/home/Benefits";
import Offers from "../components/home/Offers";
import FeaturedNotes from "../components/home/FeaturedNotes";
import SubjectCards from "../components/home/SubjectCards";
import HowItWorks from "../components/home/HowItWorks";
import Founders from "../components/home/Founders";
import FaqSection from "../components/home/FaqSection";

export default function Home() {
  return (
    <>
      <Hero />
      <Benefits />
      <Offers />
      <FeaturedNotes />
      <ReviewsWall />
      <SubjectCards />
      <HowItWorks />
      <Founders />
      <FaqSection />
    </>
  );
}
