import Hero from "../components/home/Hero";
// import ReviewsWall from "../components/home/ReviewsWall"; // re-enable with the <ReviewsWall /> line below once real reviews are in
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
      <FeaturedNotes />
      <Offers />
      {/* <ReviewsWall /> */}
      <SubjectCards />
      <HowItWorks />
      <Founders />
      <FaqSection />
    </>
  );
}
