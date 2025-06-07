
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AppRouter } from "@/components/router/AppRouter";
import { useEffect } from "react";
import { seedInitialData } from "@/utils/dataSeeder";
import "./App.css";

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    console.log('🚀 App: Initializing application...');
    
    // Seed initial data on app startup
    const initializeApp = async () => {
      try {
        console.log('🌱 App: Starting data seeding...');
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
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
