
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export const PricingSection = () => {
  const [openModal, setOpenModal] = useState<string | null>(null);

  const planDetails = {
    trial: {
      title: "Limited Free Trial Features",
      sections: [
        {
          category: "Core Roster Management",
          features: [
            "Up to 4 staff members maximum",
            "Basic roster generation with enhanced algorithms",
            "WTR (Working Time Regulations) compliance monitoring",
            "Email support during business hours"
          ]
        },
        {
          category: "Limitations",
          features: [
            "Cannot export rosters to PDF",
            "Limited to 4 staff profiles only",
            "Basic analytics dashboard only",
            "14-day trial period limit"
          ]
        }
      ]
    },
    annual: {
      title: "Annual Pro Complete Features",
      sections: [
        {
          category: "Unlimited Staff Management",
          features: [
            "Unlimited staff profiles with detailed information",
            "Complete staff member management (add, edit, delete)",
            "Role assignments and certifications tracking",
            "Hourly rates and employment details",
            "Shift preferences and eligibility settings"
          ]
        },
        {
          category: "Advanced Roster Generation",
          features: [
            "Enhanced 8-rule compliant shift algorithms",
            "Multiple shift types (8h, 12h systems)",
            "Configurable cycle lengths (weeks)",
            "Custom operational hours per day",
            "Handover time settings",
            "Staffing requirements per shift",
            "Multiple roster configurations"
          ]
        },
        {
          category: "Leave Request Management",
          features: [
            "Complete leave request system",
            "Multiple leave types (Annual, Sick, Emergency, Unpaid)",
            "Leave approval workflow",
            "Leave balance tracking",
            "Integration with roster generation"
          ]
        },
        {
          category: "Analytics and Reporting",
          features: [
            "Advanced dashboard with performance metrics",
            "Staff utilization tracking",
            "Schedule compliance monitoring",
            "Recent activity monitoring",
            "Completion rate analytics"
          ]
        },
        {
          category: "Export Capabilities",
          features: [
            "Excel/PDF export functionality",
            "Roster printing capabilities",
            "Data export for external systems"
          ]
        },
        {
          category: "Configuration Management",
          features: [
            "Save and manage multiple roster configurations",
            "Configuration templates",
            "Load existing configurations for editing",
            "Delete configurations with data cleanup"
          ]
        },
        {
          category: "Premium Support & Features",
          features: [
            "Priority support with faster response times",
            "Custom configurations tailored to your needs",
            "Multi-site support for large organizations",
            "Priority feature requests",
            "Dedicated account manager",
            "Advanced analytics and insights",
            "API access for integrations",
            "Custom integrations development",
            "Training & onboarding assistance"
          ]
        }
      ]
    }
  };

  const plans = [
    {
      id: "trial",
      name: "Limited Free Trial",
      price: "£0",
      period: "14 days",
      description: "Perfect for getting started",
      features: [
        "Up to 4 staff members",
        "Basic roster generation",
        "Email support",
        "WTR compliance monitoring"
      ],
      buttonText: "Start Free Trial",
      buttonVariant: "outline" as const,
      popular: false
    },
    {
      id: "annual",
      name: "Annual Pro",
      price: "£399",
      period: "per year",
      description: "Full-featured roster management",
      features: [
        "Unlimited staff profiles",
        "Advanced roster algorithms",
        "Leave request management",
        "Analytics and reporting",
        "Excel/PDF export",
        "Priority support",
        "Custom configurations",
        "Multi-site support",
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
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature, featureIdx) => (
                  <div key={featureIdx} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost"
                      className="w-full border border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                      size="lg"
                    >
                      <Info className="w-4 h-4 mr-2" />
                      More Info
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold text-gray-900">
                        {planDetails[plan.id as keyof typeof planDetails].title}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 mt-4">
                      {planDetails[plan.id as keyof typeof planDetails].sections.map((section, sectionIdx) => (
                        <div key={sectionIdx}>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">
                            {section.category}
                          </h4>
                          <div className="space-y-2">
                            {section.features.map((feature, featureIdx) => (
                              <div key={featureIdx} className="flex items-start">
                                <Check className="w-4 h-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700 text-sm">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>

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
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            All plans include 14-day free trial • Cancel anytime
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
