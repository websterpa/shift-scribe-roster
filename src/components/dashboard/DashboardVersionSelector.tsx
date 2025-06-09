
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardVersion1 from './DashboardVersion1';
import DashboardVersion2 from './DashboardVersion2';
import DashboardVersion3 from './DashboardVersion3';
import DashboardVersion4 from './DashboardVersion4';

const DashboardVersionSelector = () => {
  const [selectedVersion, setSelectedVersion] = useState(1);

  const versions = [
    { id: 1, name: 'Modern Gradients', description: 'Card-based with gradients and animations' },
    { id: 2, name: 'Minimalist Clean', description: 'Clean typography-focused design' },
    { id: 3, name: 'Analytics Rich', description: 'Data-heavy with charts and metrics' },
    { id: 4, name: 'Gamified', description: 'Engaging with progress rings and achievements' }
  ];

  const renderSelectedVersion = () => {
    switch (selectedVersion) {
      case 1:
        return <DashboardVersion1 />;
      case 2:
        return <DashboardVersion2 />;
      case 3:
        return <DashboardVersion3 />;
      case 4:
        return <DashboardVersion4 />;
      default:
        return <DashboardVersion1 />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Version Selector */}
      <Card className="bg-white/90 backdrop-blur border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="text-center text-blue-800">🎨 Dashboard Design Showcase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {versions.map((version) => (
              <Button
                key={version.id}
                variant={selectedVersion === version.id ? "default" : "outline"}
                className={`h-auto p-4 text-left flex-col items-start ${
                  selectedVersion === version.id 
                    ? 'bg-blue-600 text-white' 
                    : 'hover:bg-blue-50'
                }`}
                onClick={() => setSelectedVersion(version.id)}
              >
                <div className="font-semibold">{version.name}</div>
                <div className="text-xs opacity-75 mt-1">{version.description}</div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Version Display */}
      {renderSelectedVersion()}
    </div>
  );
};

export default DashboardVersionSelector;
