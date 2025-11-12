import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Vérifier le localStorage au chargement
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    // Sinon, vérifier la préférence système
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Sauvegarder dans localStorage
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    
    // Appliquer la classe au document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev: boolean) => !prev);
  };

  return { isDarkMode, toggleDarkMode };
}
