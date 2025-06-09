
import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PricingSection = () => {
  const plans = [
    {
      name: "Free Trial",
      price: "£0",
      period: "14 days",
      description: "Perfect for getting started",
      features: [
        "Up to 5 staff members",
        "Basic roster generation",
        "Email support",
        "WTR compliance monitoring",
        "Export to PDF"
      ],
      buttonText: "Start Free Trial",
      buttonVariant: "outline" as const,
      popular: false
    },
    {
      name: "Monthly Pro",
      price: "£29",
      period: "per month",
      description: "Full-featured roster management",
      features: [
        "Unlimited staff profiles",
        "Advanced roster algorithms",
        "Leave request management",
        "Analytics and reporting",
        "Excel/PDF export",
        "Priority support",
        "Custom configurations",
        "Multi-site support"
      ],
      buttonText: "Start Monthly Plan",
      buttonVariant: "default" as const,
      popular: false
    },
    {
      name: "Annual Pro",
      price: "£23",
      period: "per month",
      originalPrice: "£29",
      yearlyPrice: "£276",
      description: "Best value - Save 20% annually",
      features: [
        "Everything in Monthly Pro",
        "20% annual discount",
        "Priority feature requests",
        "Dedicated account manager",
        "Advanced analytics",
        "API access",
        "Custom integrations",
        "Training & onboarding"
      ],
      buttonText: "Start Annual Plan",
      buttonVariant: "default" as const,
      popular: true
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Choose the plan that works best for your organization
          </p>
          <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
            <Star className="w-4 h-4 mr-2" />
            Save 20% with annual billing
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, idx) => (
            <div 
              key={idx} 
              className={`relative bg-white rounded-2xl p-8 border shadow-sm hover:shadow-lg transition-all duration-300 ${
                plan.popular 
                  ? 'border-purple-200 shadow-purple-100 bg-gradient-to-br from-white to-purple-50' 
                  : 'border-gray-200 hover:border-purple-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {plan.description}
                </p>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-600 ml-2">
                    {plan.period}
                  </span>
                </div>
                {plan.originalPrice && (
                  <div className="mt-2">
                    <span className="text-gray-500 line-through text-lg">
                      {plan.originalPrice}/month
                    </span>
                    <div className="text-sm text-gray-600 mt-1">
                      Billed annually ({plan.yearlyPrice}/year)
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature, featureIdx) => (
                  <div key={featureIdx} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <Link to="/auth" className="block">
                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg' 
                      : plan.buttonVariant === 'outline' 
                        ? 'border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50' 
                        : 'bg-gray-900 hover:bg-gray-800'
                  }`}
                  variant={plan.popular ? 'default' : plan.buttonVariant}
                  size="lg"
                >
                  {plan.buttonText}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            All plans include 14-day free trial • No credit card required • Cancel anytime
          </p>
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <Check className="w-4 h-4 text-green-500 mr-2" />
              WTR Compliant
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 text-green-500 mr-2" />
              GDPR Compliant
            </div>
            <div className="flex items-center">
              <Check className="w-4 h-4 text-green-500 mr-2" />
              UK Based Support
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
