import React from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import RosterWizard from '@/components/RosterWizard';

export default function LegacyWizardDeprecated() {
  const showBanner = !window.location.search.includes('legacy=1');

  return (
    <div className="min-h-screen bg-slate-50">
      {showBanner && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="max-w-6xl mx-auto">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  <strong>This wizard is deprecated.</strong> Try the new Roster Builder v2 for improved validation and live previews.
                </span>
                <Link to="/roster/builder">
                  <Button variant="outline" size="sm" className="ml-4">
                    Try New Builder <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto p-6">
        {showBanner && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Legacy Roster Wizard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                You're using the legacy wizard. The new Roster Builder v2 offers:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 mb-4">
                <li>Schema-first validation with immediate feedback</li>
                <li>Live previews of requirements and costs</li>
                <li>Better shift token compliance</li>
                <li>Improved night shift handling</li>
              </ul>
              <div className="flex gap-2">
                <Link to="/roster/builder">
                  <Button>Switch to New Builder</Button>
                </Link>
                <Link to="/wizard?legacy=1">
                  <Button variant="outline">Continue with Legacy</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
        
        <RosterWizard />
      </div>
    </div>
  );
}