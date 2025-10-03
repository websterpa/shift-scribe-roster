
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AppRouter } from "@/components/router/AppRouter";
import { AppErrorBoundary } from "@/components/layout/AppErrorBoundary";
import { useEffect } from "react";
import { seedInitialData } from "@/utils/dataSeeder";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    console.log('🚀 App: Initializing application...');
    
    // Seed initial data on app startup (development only)
    const initializeApp = async () => {
      if (!import.meta.env.DEV) {
        console.log('⚠️ App: Skipping data seeding in production');
        return;
      }
      
      try {
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
      <QueryClientProvider client={queryClient}>
        <AppRouter />
        <Toaster />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
