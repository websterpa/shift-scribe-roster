
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/utils/errorLogger';
import { Link } from 'react-router-dom';

const logger = createLogger('SignUpForm');

export const SignUpForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: ''
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    if (!termsAccepted || !privacyAccepted) {
      setError('Please accept the Terms & Conditions and Privacy Policy to continue.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: formData.fullName,
            company_name: formData.companyName,
            terms_accepted: termsAccepted,
            privacy_accepted: privacyAccepted
          }
        }
      });

      if (error) {
        logger.error(new Error('Sign up failed'), { error: error.message });
        setError(error.message);
        return;
      }

      if (data.user) {
        logger.info('Sign up successful', { userId: data.user.id });
        if (data.user.email_confirmed_at) {
          navigate('/dashboard');
        } else {
          setMessage('Please check your email and click the confirmation link to complete your registration.');
        }
      }
    } catch (error: any) {
      logger.error(new Error('Sign up error'), { originalError: error });
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          value={formData.fullName}
          onChange={handleInputChange}
          required
          disabled={isLoading}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="companyName">Company Name (Optional)</Label>
        <Input
          id="companyName"
          name="companyName"
          type="text"
          value={formData.companyName}
          onChange={handleInputChange}
          disabled={isLoading}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          required
          disabled={isLoading}
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleInputChange}
          required
          disabled={isLoading}
          className="mt-1"
          minLength={6}
        />
        <p className="text-sm text-gray-500 mt-1">
          Must be at least 6 characters long
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
            disabled={isLoading}
          />
          <Label htmlFor="terms" className="text-sm leading-relaxed">
            I agree to the{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-700 underline">
              Terms & Conditions
            </Link>
          </Label>
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="privacy"
            checked={privacyAccepted}
            onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
            disabled={isLoading}
          />
          <Label htmlFor="privacy" className="text-sm leading-relaxed">
            I agree to the{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-700 underline">
              Privacy Policy
            </Link>
          </Label>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !termsAccepted || !privacyAccepted}
      >
        {isLoading ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  );
};
