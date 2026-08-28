'use client';

import { useEffect, useState } from 'react';
import { Shield, X } from 'lucide-react';

interface CookieBannerProps {
  onAccept: () => void;
  onDecline: () => void;
  onViewPrivacy: () => void;
}

export function CookieBanner({ onAccept, onDecline, onViewPrivacy }: CookieBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Petit délai pour l'animation
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md z-[100] animate-slide-up">
      <div className="rounded-[2rem] shadow-2xl shadow-blue-500/10">
      <div className="bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200 dark:border-gray-700 p-6 rounded-[2rem]">
        <div className="flex items-start gap-4 mb-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 p-2.5 rounded-2xl flex-shrink-0">
            <Shield size={24} />
          </div>
          <div className="flex-grow">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-bold text-gray-900 dark:text-white">Cookies & Confidentialité</h4>
              <button 
                onClick={onDecline}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Fermer"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Nous utilisons des cookies pour améliorer votre expérience et analyser notre trafic. En cliquant sur "Accepter", vous consentez à notre utilisation des cookies. 
              <button 
                onClick={onViewPrivacy}
                className="text-blue-600 hover:text-blue-700 font-semibold ml-1 underline decoration-2 underline-offset-4"
              >
                En savoir plus
              </button>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={onAccept}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]"
          >
            Accepter tout
          </button>
          <button 
            onClick={onDecline}
            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-2xl font-bold text-sm transition-all"
          >
            Refuser
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
