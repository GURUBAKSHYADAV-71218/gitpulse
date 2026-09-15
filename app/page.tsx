import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WhatWeAnalyze } from "@/components/landing/WhatWeAnalyze";
import { ExampleReport } from "@/components/landing/ExampleReport";
import { WhyItMatters, FinalCta } from "@/components/landing/ClosingSections";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div>
      <Hero />
      <HowItWorks />
      <WhatWeAnalyze />
      <ExampleReport />
      <WhyItMatters />
      <FinalCta />
      <Footer />
    </div>
  );
}
