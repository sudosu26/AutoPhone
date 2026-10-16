import React, { useState, useEffect } from 'react';
import { useNavigation, type RouteType } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { STORAGE_KEYS, APP_NAME, APP_VERSION } from '../utils/constants';
import {
  LayoutDashboard,
  ListTodo,
  Clock,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Radio,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  id: RouteType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matches: RouteType[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, matches: ['dashboard'] },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, matches: ['tasks', 'task-create', 'task-detail'] },
  { id: 'history', label: 'History', icon: Clock, matches: ['history'] },
  { id: 'diagnostics', label: 'Diagnostics', icon: Activity, matches: ['diagnostics'] },
  { id: 'settings', label: 'Settings', icon: Settings, matches: ['settings'] },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentRoute, navigate } = useNavigation();
  const { isOnline, logout } = useAuth();
  
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COLLAPSED_SIDEBAR);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COLLAPSED_SIDEBAR, String(isCollapsed));
    } catch {
      // ignore
    }
  }, [isCollapsed]);

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentRoute]);

  const isNavActive = (item: NavItem) => {
    return item.matches.includes(currentRoute);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-navy-950 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Desktop & Mobile */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen flex flex-col justify-between bg-white dark:bg-navy-900 border-r border-slate-200 dark:border-navy-700 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } ${
          mobileMenuOpen
            ? 'translate-x-0 w-64 shadow-2xl'
            : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Logo & Collapse Header */}
        <div>
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-navy-700">
            <div
              className={`flex items-center gap-3 overflow-hidden cursor-pointer ${
                isCollapsed ? 'md:justify-center md:w-full' : ''
              }`}
              onClick={() => navigate('dashboard')}
              title={APP_NAME}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Radio className="w-5 h-5 animate-pulse-subtle" />
              </div>
              {(!isCollapsed || mobileMenuOpen) && (
                <div className="min-w-0">
                  <h1 className="font-bold text-base leading-tight tracking-tight text-slate-900 dark:text-white truncate">
                    {APP_NAME}
                  </h1>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-navy-300 block -mt-0.5">
                    v{APP_VERSION}
                  </span>
                </div>
              )}
            </div>

            {/* Mobile close button */}
            {mobileMenuOpen && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(item);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 hover:text-slate-900 dark:hover:text-white'
                  } ${isCollapsed ? 'md:justify-center md:px-0' : ''}`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-slate-400 dark:text-navy-300'}`} />
                  {(!isCollapsed || mobileMenuOpen) && (
                    <span className="truncate">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Desktop Collapse Toggle */}
        <div className="p-3 border-t border-slate-200 dark:border-navy-700 hidden md:block">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar collapse"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <div className="flex items-center gap-2 text-xs font-medium">
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6 bg-white/80 dark:bg-navy-900/80 backdrop-blur-md border-b border-slate-200 dark:border-navy-700 transition-colors">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 md:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Title */}
            <div className="flex items-center gap-2 md:hidden">
              <span className="font-bold text-base text-slate-900 dark:text-white">
                {APP_NAME}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Connectivity Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}
              title={isOnline ? 'Connected to backend' : 'Backend offline or unreachable'}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('login');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-slate-200 dark:border-navy-700 transition-colors cursor-pointer"
              title="Logout from PhonePilot"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
