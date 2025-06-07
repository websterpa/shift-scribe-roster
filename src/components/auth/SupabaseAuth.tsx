
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createLogger } from '@/utils/errorLogger';

const logger = createLogger('SupabaseAuth');

interface SupabaseAuthProps {
  onAuthSuccess: () => void;
}

export const SupabaseAuth: React.FC<SupabaseAuthProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('demo123456');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    
    logger.info('Attempting signup with Supabase');
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            is_admin: true // Mark as admin for demo purposes
          }
        }
      });
      
      if (error) {
        logger.error(new Error('Signup failed'), { error: error.message });
        setError(error.message);
        return;
      }
      
      if (data.user) {
        logger.info('Signup successful', { userId: data.user.id });
        setMessage('Account created successfully! You can now sign in.');
      }
    } catch (error: any) {
      logger.error(new Error('Signup error'), { originalError: error });
      setError('An unexpected error occurred during signup.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    
    logger.info('Attempting signin with Supabase');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        logger.error(new Error('Signin failed'), { error: error.message });
        setError(error.message);
        return;
      }
      
      if (data.user) {
        logger.info('Signin successful', { userId: data.user.id });
        localStorage.setItem('demo_authenticated', 'true');
        onAuthSuccess();
      }
    } catch (error: any) {
      logger.error(new Error('Signin error'), { originalError: error });
      setError('An unexpected error occurred during signin.');
    } finally {
      setIsLoading(false);
    }
  };

  const createDemoAccount = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');
    
    try {
      logger.info('Creating demo admin account');
      
      const { data, error } = await supabase.auth.signUp({
        email: 'admin@demo.com',
        password: 'demo123456',
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            is_admin: true,
            full_name: 'Demo Administrator'
          }
        }
      });
      
      if (error && error.message.includes('already registered')) {
        // Account exists, try to sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'admin@demo.com',
          password: 'demo123456',
        });
        
        if (signInError) {
          setError('Demo account exists but signin failed. Try manual signin.');
          return;
        }
        
        if (signInData.user) {
          localStorage.setItem('demo_authenticated', 'true');
          onAuthSuccess();
          return;
        }
      }
      
      if (error) {
        setError(error.message);
        return;
      }
      
      if (data.user) {
        setMessage('Demo account created! You can now sign in with admin@demo.com / demo123456');
      }
    } catch (error: any) {
      logger.error(new Error('Demo account creation error'), { originalError: error });
      setError('Failed to create demo account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">CCTV Roster Management</CardTitle>
          <CardDescription className="text-center">
            Sign in to access the roster management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Button 
              onClick={createDemoAccount} 
              className="w-full mb-4" 
              variant="outline"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Quick Demo Access'}
            </Button>
          </div>
          
          <Tabs defaultValue="signin" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@demo.com"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="demo123456"
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {message && (
            <Alert className="mt-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          
          <div className="text-sm text-gray-600 text-center mt-4">
            <p>Demo credentials: admin@demo.com / demo123456</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
