import { PublicLayout } from '../../components/layout/PublicLayout';
import { HeroSection } from '../../components/public/HeroSection';
import { SocialProofSection } from '../../components/public/SocialProofSection';
import { FeaturesSection } from '../../components/public/FeaturesSection';
import { HowItWorksSection } from '../../components/public/HowItWorksSection';
import { PricingSummarySection } from '../../components/public/PricingSummarySection';
import { TestimonialsSection } from '../../components/public/TestimonialsSection';
import { FinalCTASection } from '../../components/public/FinalCTASection';

export function LandingPage() {
  return (
    <PublicLayout>
      <HeroSection />
      <SocialProofSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSummarySection />
      <TestimonialsSection />
      <FinalCTASection />
    </PublicLayout>
  );
}
