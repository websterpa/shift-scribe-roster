
import React from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { PricingSection } from '@/components/landing/PricingSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <div className="py-12">
        <PricingSection />
      </div>
      <LandingFooter />
    </div>
  );
};

export default PricingPage;
