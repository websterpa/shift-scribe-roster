
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: 'Free',
      description: 'Perfect for trying out our platform',
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        'Create and manage staff profiles',
        'Basic roster configuration',
        'Enter shift data and preferences',
        'Leave request management',
        'Email support'
      ],
      limitations: [
        'Cannot view generated rosters',
        'No roster export',
        'Limited to 5 staff members'
      ],
      cta: 'Start Free',
      popular: false
    },
    {
      name: 'Pro',
      description: 'Full roster management solution',
      monthlyPrice: 49,
      annualPrice: 490,
      features: [
        'Everything in Free',
        'Full roster generation',
        'Advanced scheduling algorithms',
        'WTR compliance monitoring',
        'Unlimited staff members',
        'Analytics and reporting',
        'Export to Excel/PDF',
        'Priority support',
        '12 months access'
      ],
      limitations: [],
      cta: 'Start Pro Trial',
      popular: true
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Choose the plan that works best for your organization
          </p>
          
          <div className="flex items-center justify-center mb-8">
            <span className={`mr-3 ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isAnnual ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnnual ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`ml-3 ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
              Annual (save 17%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`bg-white rounded-2xl p-8 ${
                plan.popular 
                  ? 'ring-2 ring-blue-600 shadow-xl relative' 
                  : 'border border-gray-200 shadow-sm'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {plan.description}
                </p>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    £{isAnnual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-gray-600">
                    /{isAnnual ? 'year' : 'month'}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
                {plan.limitations.map((limitation, idx) => (
                  <div key={idx} className="flex items-start">
                    <div className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0">
                      <div className="w-3 h-3 bg-gray-300 rounded-full mx-auto mt-1"></div>
                    </div>
                    <span className="text-gray-500">{limitation}</span>
                  </div>
                ))}
              </div>

              <Link to="/auth" className="block">
                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-900 hover:bg-gray-800'
                  }`}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
