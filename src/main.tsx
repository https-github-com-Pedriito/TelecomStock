import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { MobileDebugConsole } from './components/MobileDebugConsole';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MobileDebugConsole />
    <App />
  </StrictMode>
);
