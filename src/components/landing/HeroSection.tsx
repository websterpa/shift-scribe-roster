
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';

export const HeroSection = () => {
  return (
    <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 py-20 relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-indigo-600/5"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Effortless Shift
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 block">
              Roster Management
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline your security operations with intelligent shift scheduling. 
            Generate compliant rosters, manage leave requests, and optimize staff allocation 
            with our powerful SaaS platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-2 border-purple-200 hover:border-purple-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transform hover:scale-105 transition-all duration-300">
                View Pricing
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center bg-white/60 backdrop-blur-sm px-3 py-2 rounded-full">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              Free 14-day trial
            </div>
            <div className="flex items-center bg-white/60 backdrop-blur-sm px-3 py-2 rounded-full">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              No credit card required
            </div>
            <div className="flex items-center bg-white/60 backdrop-blur-sm px-3 py-2 rounded-full">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              WTR compliant
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
