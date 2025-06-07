
import React from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PricingSection = () => {
  const features = [
    'Create and manage unlimited staff profiles',
    'Full roster generation with advanced algorithms',
    'WTR compliance monitoring',
    'Unlimited roster configurations',
    'Leave request management',
    'Analytics and reporting',
    'Export to Excel/PDF',
    'Priority support'
  ];

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Complete roster management solution
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Everything you need to manage CCTV operator schedules efficiently
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Professional Edition
              </h3>
              <p className="text-gray-600 mb-4">
                Full-featured roster management for your organization
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <Link to="/auth" className="block">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
