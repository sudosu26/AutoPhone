import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type RouteType =
  | 'dashboard'
  | 'tasks'
  | 'task-detail'
  | 'task-create'
  | 'history'
  | 'diagnostics'
  | 'settings'
  | 'login';

interface NavigationContextType {
  currentRoute: RouteType;
  params: Record<string, string>;
  navigate: (route: RouteType, params?: Record<string, string>) => void;
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

function parseHash(): { route: RouteType; params: Record<string, string> } {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash) {
    return { route: 'dashboard', params: {} };
  }

  const [path, queryString] = hash.split('?');
  const segments = path.split('/').filter(Boolean);
  const params: Record<string, string> = {};

  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((val, key) => {
      params[key] = val;
    });
  }

  if (segments[0] === 'tasks') {
    if (segments[1] === 'create' || segments[1] === 'new') {
      return { route: 'task-create', params };
    }
    if (segments[1]) {
      params.id = segments[1];
      return { route: 'task-detail', params };
    }
    return { route: 'tasks', params };
  }

  if (segments[0] === 'history') {
    return { route: 'history', params };
  }

  if (segments[0] === 'diagnostics') {
    return { route: 'diagnostics', params };
  }

  if (segments[0] === 'settings') {
    return { route: 'settings', params };
  }

  if (segments[0] === 'login') {
    return { route: 'login', params };
  }

  return { route: 'dashboard', params };
}

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [navState, setNavState] = useState(() => parseHash());

  useEffect(() => {
    const handleHashChange = () => {
      setNavState(parseHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((route: RouteType, params?: Record<string, string>) => {
    let hash = '';
    const query = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (k !== 'id') query.set(k, v);
      });
    }

    const qs = query.toString() ? `?${query.toString()}` : '';

    switch (route) {
      case 'dashboard':
        hash = '#/dashboard';
        break;
      case 'tasks':
        hash = `#/tasks${qs}`;
        break;
      case 'task-create':
        hash = '#/tasks/create';
        break;
      case 'task-detail':
        hash = `#/tasks/${params?.id || ''}${qs}`;
        break;
      case 'history':
        hash = `#/history${qs}`;
        break;
      case 'diagnostics':
        hash = '#/diagnostics';
        break;
      case 'settings':
        hash = '#/settings';
        break;
      case 'login':
        hash = '#/login';
        break;
      default:
        hash = '#/dashboard';
    }

    window.location.hash = hash;
    setNavState({ route, params: params || {} });
  }, []);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('dashboard');
    }
  }, [navigate]);

  return (
    <NavigationContext.Provider
      value={{
        currentRoute: navState.route,
        params: navState.params,
        navigate,
        goBack,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
