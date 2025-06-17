
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ items, className = "" }) => {
  return (
    <nav className={`flex items-center gap-1 text-sm ${className}`}>
      <Link to="/dashboard">
        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 px-2">
          <Home className="h-4 w-4" />
        </Button>
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          {item.href ? (
            <Link to={item.href}>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 px-2">
                {item.label}
              </Button>
            </Link>
          ) : (
            <span className="text-gray-900 font-medium px-2">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
