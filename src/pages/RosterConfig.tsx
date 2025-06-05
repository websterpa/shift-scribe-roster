
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

const RosterConfig = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Roster Configuration</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Current Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Cycle Length</label>
              <p className="text-lg">4 weeks</p>
            </div>
            <div>
              <label className="text-sm font-medium">Shifts per Day</label>
              <p className="text-lg">3 shifts</p>
            </div>
            <div>
              <label className="text-sm font-medium">Minimum Staff per Shift</label>
              <p className="text-lg">2 operators</p>
            </div>
            <div>
              <label className="text-sm font-medium">Maximum Consecutive Shifts</label>
              <p className="text-lg">5 shifts</p>
            </div>
            <div>
              <label className="text-sm font-medium">Minimum Rest Hours</label>
              <p className="text-lg">11 hours</p>
            </div>
            <Button className="w-full">Edit Configuration</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shift Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-3">
              <div className="font-medium">Day Shift</div>
              <div className="text-sm text-gray-600">06:00 - 14:00</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="font-medium">Evening Shift</div>
              <div className="text-sm text-gray-600">14:00 - 22:00</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="font-medium">Night Shift</div>
              <div className="text-sm text-gray-600">22:00 - 06:00</div>
            </div>
            <Button variant="outline" className="w-full">
              Modify Shift Hours
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RosterConfig;
