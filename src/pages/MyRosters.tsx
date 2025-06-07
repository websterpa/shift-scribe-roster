
import React from 'react';
import { SubscriptionGate } from '@/components/subscription/SubscriptionGate';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Download, Eye } from 'lucide-react';

const MyRosters = () => {
  return (
    <SubscriptionGate 
      feature="Roster Viewing" 
      description="Access and manage your generated rosters with export capabilities"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Rosters</h1>
          <p className="text-gray-600">
            View, manage, and export your generated shift rosters.
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Generated Rosters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rosters generated yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first roster to see it here. Generated rosters will appear with options to view and export.
              </p>
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                View Sample Roster
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SubscriptionGate>
  );
};

export default MyRosters;
