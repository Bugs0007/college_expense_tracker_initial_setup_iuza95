import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        // Check if theme is stored in localStorage
        const savedTheme = localStorage.getItem('theme');
        // Check if user prefers dark mode
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return (savedTheme as 'light' | 'dark') || (prefersDark ? 'dark' : 'light');
    });

    useEffect(() => {
        // Update data-theme attribute on document
        document.documentElement.setAttribute('data-theme', theme);
        // Save theme preference to localStorage
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? <Moon /> : <Sun />}
        </button>
    );
}; 