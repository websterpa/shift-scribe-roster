
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Calendar } from 'lucide-react';

const GenerateRoster = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Generate Roster</h1>
        <p className="text-gray-600">
          Create optimized shift schedules based on your configuration and staff availability.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Generation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="config">Select Configuration:</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Choose a configuration..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Configuration</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              No configurations found. Create one in Roster Config first.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rosterName">
              Roster Name: <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rosterName"
              type="text"
              placeholder="e.g. June 2025 Month 1"
              required
            />
            <p className="text-xs text-gray-500">This name will be saved with your roster version</p>
          </div>

          <Button className="w-full">
            <Calendar className="h-4 w-4 mr-2" />
            Generate Roster
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default GenerateRoster;
