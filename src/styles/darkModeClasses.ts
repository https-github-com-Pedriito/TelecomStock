// Classes Tailwind pour le mode sombre - à utiliser partout dans l'app

export const darkMode = {
  // Backgrounds
  bg: {
    primary: 'bg-white dark:bg-gray-800',
    secondary: 'bg-gray-50 dark:bg-gray-900',
    tertiary: 'bg-gray-100 dark:bg-gray-700',
    card: 'bg-white dark:bg-gray-800',
    hover: 'hover:bg-gray-50 dark:hover:bg-gray-700',
    active: 'bg-blue-50 dark:bg-gray-700',
  },
  
  // Textes
  text: {
    primary: 'text-gray-900 dark:text-white',
    secondary: 'text-gray-600 dark:text-gray-300',
    tertiary: 'text-gray-500 dark:text-gray-400',
    muted: 'text-gray-400 dark:text-gray-500',
    inverted: 'text-white dark:text-gray-900',
  },
  
  // Bordures
  border: {
    primary: 'border-gray-200 dark:border-gray-700',
    secondary: 'border-gray-300 dark:border-gray-600',
    divider: 'divide-gray-200 dark:divide-gray-700',
  },
  
  // Inputs
  input: {
    base: 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
    focus: 'focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400',
  },
  
  // Boutons
  button: {
    secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
    ghost: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
  },
  
  // Modales
  modal: {
    overlay: 'bg-black bg-opacity-50 dark:bg-opacity-70',
    content: 'bg-white dark:bg-gray-800',
  },
  
  // Labels
  label: 'text-gray-700 dark:text-gray-300',
};
