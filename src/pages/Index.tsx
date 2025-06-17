
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useSupabaseAuth();

  useEffect(() => {
    console.log('📍 Index: Navigation logic - authenticated:', isAuthenticated, 'loading:', loading);
    
    if (!loading) {
      // Always redirect to dashboard for now (since auth is mocked)
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Loading...</h1>
          <p className="text-muted-foreground">Please wait while we load your app</p>
        </div>
      </div>
    );
  }

  // This should rarely be seen due to the redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">Redirecting...</h1>
        <p className="text-muted-foreground">Taking you to your dashboard</p>
      </div>
    </div>
  );
};

export default Index;
