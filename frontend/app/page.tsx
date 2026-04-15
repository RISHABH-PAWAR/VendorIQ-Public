import { HeroSection } from '@/components/landing/HeroSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function HomePage() {
  return (
    <div className="relative overflow-x-hidden">
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <PricingSection />
      <LandingFooter />
    </div>
  );
}
