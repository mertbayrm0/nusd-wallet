import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        const saved = localStorage.getItem('theme');
        return (saved as Theme) || 'dark';
    });

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    // Apply theme class to document
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
        } else {
            root.classList.add('light');
            root.classList.remove('dark');
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

// Theme-aware class helper
export const themeClass = (darkClass: string, lightClass: string, isDark: boolean): string => {
    return isDark ? darkClass : lightClass;
};

// Common theme classes
export const themeClasses = {
    // Backgrounds
    bgPrimary: (isDark: boolean) => isDark ? 'bg-[#111111]' : 'bg-white',
    bgSecondary: (isDark: boolean) => isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50',
    bgTertiary: (isDark: boolean) => isDark ? 'bg-[#2a2a2a]' : 'bg-gray-100',

    // Text
    textPrimary: (isDark: boolean) => isDark ? 'text-white' : 'text-gray-900',
    textSecondary: (isDark: boolean) => isDark ? 'text-gray-400' : 'text-gray-600',
    textMuted: (isDark: boolean) => isDark ? 'text-gray-500' : 'text-gray-500',

    // Borders
    borderLight: (isDark: boolean) => isDark ? 'border-white/5' : 'border-gray-200',
    borderMedium: (isDark: boolean) => isDark ? 'border-white/10' : 'border-gray-300',

    // Cards
    card: (isDark: boolean) => isDark
        ? 'bg-[#1a1a1a] border-white/5'
        : 'bg-white border-gray-200 shadow-sm',

    // Inputs
    input: (isDark: boolean) => isDark
        ? 'bg-[#2a2a2a] border-white/10 text-white placeholder-gray-500'
        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
};
