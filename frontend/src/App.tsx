/**
 * App Root Component
 * Sets up providers for routing, react-query, auth state, and toast notifications
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import AppRoutes from './routes';
import { Toaster } from 'sonner';

// Style imports
import './styles/index.css';
import './styles/components.css';

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster 
            theme="light" 
            position="top-right" 
            richColors 
            closeButton 
            toastOptions={{
              style: {
                background: 'var(--color-bg-secondary)',
                border: 'var(--glass-border)',
                color: 'var(--color-text-primary)',
              }
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
