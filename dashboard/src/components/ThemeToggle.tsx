import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-100 dark:hover:text-white bg-slate-200/50 dark:bg-navy-800/80 hover:bg-slate-300 dark:hover:bg-navy-700 border border-slate-300 dark:border-navy-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-90" />
      ) : (
        <Moon className="w-5 h-5 text-blue-600 transition-transform duration-300 -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
};
