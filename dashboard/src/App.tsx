import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { TaskDetail } from './pages/TaskDetail';
import { CreateTask } from './pages/CreateTask';
import { History } from './pages/History';
import { Diagnostics } from './pages/Diagnostics';
import { Settings } from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const AppRouter: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { currentRoute } = useNavigation();

  if (!isAuthenticated || currentRoute === 'login') {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <Dashboard />;
      case 'tasks':
        return <Tasks />;
      case 'task-create':
        return <CreateTask />;
      case 'task-detail':
        return <TaskDetail />;
      case 'history':
        return <History />;
      case 'diagnostics':
        return <Diagnostics />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return <Layout>{renderPage()}</Layout>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NavigationProvider>
            <AppRouter />
          </NavigationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
