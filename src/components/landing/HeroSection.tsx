
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, Users, Clock } from 'lucide-react';

export const HeroSection = () => {
  return (
    <div className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white">
      <div className="absolute inset-0 bg-black opacity-10"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="text-center">
          {/* Logo */}
          <div className="mb-8">
            <img 
              src="/lovable-uploads/5af74798-d286-4a86-b70f-2c48fe182aab.png" 
              alt="ShiftCraft Logo" 
              className="h-50 w-auto mx-auto"
            />
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Effortless Shift
            <span className="block text-blue-200">Scheduling Made Simple</span>
          </h1>
          <p className="text-xl sm:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
            Transform your workforce management with AI-powered scheduling that adapts to your business needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link to="/auth">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 transition-colors">
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 transition-colors">
              Watch Demo
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="flex flex-col items-center">
              <Calendar className="w-8 h-8 mb-2 text-blue-200" />
              <div className="text-2xl font-bold">99%</div>
              <div className="text-blue-200">Schedule Accuracy</div>
            </div>
            <div className="flex flex-col items-center">
              <Users className="w-8 h-8 mb-2 text-blue-200" />
              <div className="text-2xl font-bold">500+</div>
              <div className="text-blue-200">Happy Customers</div>
            </div>
            <div className="flex flex-col items-center">
              <Clock className="w-8 h-8 mb-2 text-blue-200" />
              <div className="text-2xl font-bold">80%</div>
              <div className="text-blue-200">Time Saved</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
