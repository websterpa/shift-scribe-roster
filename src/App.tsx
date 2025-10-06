import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AppRouter } from "@/components/router/AppRouter";
import { AppErrorBoundary } from "@/components/layout/AppErrorBoundary";
import { useEffect } from "react";
import { seedInitialData } from "@/utils/dataSeeder";
import { supabase } from "@/integrations/supabase/client";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    console.log('🚀 App: Initializing application...');
    
    // Only seed in development and if user is authenticated
    const initializeApp = async () => {
      if (!import.meta.env.DEV) {
        console.log('⚠️ App: Skipping data seeding in production');
        return;
      }
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('⚠️ App: Skipping data seeding - no authenticated user');
          return;
        }
        
        console.log('🌱 App: Starting data seeding (dev only)...');
        await seedInitialData();
        console.log('✅ App: Data seeding completed');
      } catch (error) {
        console.error('❌ App: Error during initialization:', error);
        // Don't block app loading if seeding fails
      }
    };
    
    initializeApp();
  }, []);

  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppRouter />
            <Toaster />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
