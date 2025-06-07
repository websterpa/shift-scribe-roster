
import React from 'react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Terms & Conditions
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using the CCTV Roster service, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Service Description</h2>
              <p className="text-gray-700 mb-4">
                CCTV Roster is a Software as a Service (SaaS) platform that provides shift scheduling and roster management tools for CCTV user groups and security organizations.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Subscription Plans</h2>
              <div className="text-gray-700 mb-4">
                <h3 className="text-lg font-semibold mb-2">Free Plan</h3>
                <ul className="list-disc list-inside mb-4">
                  <li>Access to staff management features</li>
                  <li>Basic roster configuration</li>
                  <li>Limited to 5 staff members</li>
                  <li>Cannot view generated rosters</li>
                </ul>
                
                <h3 className="text-lg font-semibold mb-2">Pro Plan</h3>
                <ul className="list-disc list-inside mb-4">
                  <li>Full roster generation access</li>
                  <li>Unlimited staff members</li>
                  <li>Advanced features and analytics</li>
                  <li>12 months access from subscription date</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Payment Terms</h2>
              <p className="text-gray-700 mb-4">
                Pro subscriptions are billed monthly or annually. All fees are non-refundable except as required by law. We accept payments via Stripe and PayPal.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. User Responsibilities</h2>
              <ul className="list-disc list-inside text-gray-700 mb-4">
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Use the service in compliance with applicable laws</li>
                <li>Provide accurate and up-to-date information</li>
                <li>Not misuse or abuse the service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Protection</h2>
              <p className="text-gray-700 mb-4">
                We are committed to protecting your data. Please refer to our Privacy Policy for detailed information about how we collect, use, and protect your personal information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Service Availability</h2>
              <p className="text-gray-700 mb-4">
                While we strive to maintain 99.9% uptime, we cannot guarantee uninterrupted service. We may perform maintenance that temporarily affects service availability.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                Our liability is limited to the amount paid for the service. We are not liable for any indirect, incidental, or consequential damages.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Termination</h2>
              <p className="text-gray-700 mb-4">
                Either party may terminate the service agreement at any time. Upon termination, access to the service will be discontinued, but data may be retained according to our data retention policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these terms at any time. Users will be notified of significant changes via email or through the service interface.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                For questions about these terms, please contact us at support@cctvlevelentry.com
              </p>
            </section>
          </div>
        </div>
      </div>
      
      <LandingFooter />
    </div>
  );
};

export default TermsPage;
