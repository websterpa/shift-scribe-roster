
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createLogger } from '@/utils/errorLogger';

const logger = createLogger('SimpleAuth');

interface SimpleAuthProps {
  onLogin: (isAuthenticated: boolean) => void;
}

export const SimpleAuth: React.FC<SimpleAuthProps> = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    logger.info('Attempting login with PIN');
    
    try {
      // Simple demo authentication - in production this would be proper Supabase auth
      if (pin === '1234' || pin === 'demo') {
        logger.info('Login successful');
        localStorage.setItem('demo_authenticated', 'true');
        onLogin(true);
      } else {
        setError('Invalid PIN. Use "1234" or "demo" for the demonstration.');
        logger.warn('Login failed - invalid PIN');
      }
    } catch (error) {
      logger.error(new Error('Login error'), { originalError: error });
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Roster Management</CardTitle>
          <CardDescription className="text-center">
            Enter your PIN to access the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter your PIN"
                required
                disabled={isLoading}
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
            
            <div className="text-sm text-gray-600 text-center mt-4">
              <p>Demo PINs: "1234" or "demo"</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
