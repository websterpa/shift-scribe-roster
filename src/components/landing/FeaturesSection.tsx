
import React from 'react';
import { Calendar, Users, Shield, BarChart3, Clock, FileText } from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Smart Roster Generation',
    description: 'Automatically generate optimal shift schedules based on staff availability, preferences, and compliance requirements.'
  },
  {
    icon: Users,
    title: 'Staff Management',
    description: 'Comprehensive staff profiles with skills, certifications, and availability tracking for better resource allocation.'
  },
  {
    icon: Shield,
    title: 'WTR Compliance',
    description: 'Built-in Working Time Regulations compliance ensures your rosters meet legal requirements automatically.'
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reporting',
    description: 'Detailed insights into staff utilization, costs, and performance metrics to optimize your operations.'
  },
  {
    icon: Clock,
    title: 'Leave Management',
    description: 'Streamlined leave request system with approval workflows and automatic roster adjustments.'
  },
  {
    icon: FileText,
    title: 'Configuration Templates',
    description: 'Save and reuse roster configurations for different sites, shifts, and operational requirements.'
  }
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything you need for efficient roster management
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our comprehensive platform handles all aspects of shift scheduling, 
            from basic roster creation to advanced compliance monitoring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-50 p-6 rounded-xl hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
