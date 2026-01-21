import React, { useState } from 'react';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  error: string | null;
}

export function LoginForm({ onLogin, error }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { loading: isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted');
    
    if (!email || !password) {
      console.log('Email or password missing');
      return;
    }
    
    try {
      console.log('LoginForm: Attempting login with email:', email);
      console.log('LoginForm: Calling onLogin...');
      await onLogin(email, password);
      console.log('LoginForm: onLogin completed');
    } catch (err) {
      console.error('LoginForm: Login error:', err);
      // L'erreur est déjà gérée via le prop error
    }
  };

  const demoAccounts = [
    { email: 'admin@telecom.com', role: 'Admin - Accès complet', password: 'admin123' },
    { email: 'manager@telecom.com', role: 'Manager - Inventaire et scanner', password: 'manager123' },
    { email: 'tech@telecom.com', role: 'Technicien - Scanner uniquement', password: 'tech123' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col lg:flex-row">
      {/* Bannière Beta moderne avec effet néon */}
      <div className="fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-purple-500/30 z-50 overflow-y-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-blue-600/10 animate-pulse"></div>
        <div className="relative max-w-7xl mx-auto py-2.5 px-4 flex items-center justify-center gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="relative inline-flex items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75 animate-ping"></span>
              <span className="relative inline-flex items-center justify-center px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold text-xs sm:text-sm tracking-widest text-white shadow-lg shadow-purple-500/50 ">
                BETA
              </span>
            </span>
            <div className="hidden sm:flex items-center gap-2 text-white/90">
              <span className="text-sm font-medium bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Version de test
              </span>
              <span className="text-xs text-white/60">•</span>
              <span className="text-xs text-white/60">Vos retours comptent</span>
            </div>
            <span className="sm:hidden text-xs text-white/70 font-medium overflow-hidden">
              Test en cours
            </span>
          </div>
        </div>
      </div>
      
      {/* Section gauche - Marketing (visible seulement sur desktop) */}
      <div className="hidden lg:flex lg:w-3/5 bg-gradient-to-br from-blue-600 to-blue-800 flex-col items-start justify-center p-12 text-white">

        <div className="max-w-lg space-y-12">
          <div className="flex items-center gap-3">
            <img src="/decimalestock.png" alt="Logo Decimale Stock" className="w-16 h-16 object-contain" />
            <span className="text-2xl font-bold">Decimale Stock</span>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-6xl font-bold leading-tight">
              Maîtrisez votre sotck, sans friction.
            </h1>
            
            <p className="text-lg text-blue-100 leading-relaxed">
              Suivi en temps réel , inventaires rapides, scanner intégré. Pensé pour les équipes terrain
            </p>
          </div>
        </div>
      </div>
      
      {/* Section droite - Formulaire */}
      <div className="flex-1  lg:w-2/5 flex flex-col items-center justify-center p-6 sm:p-4 pt-20 pb-32 lg:pt-0 lg:p-6 bg-white min-h-screen lg:min-h-0 overflow-y-hidden">
       
          <div className="bg-white shadow-lg rounded-2xl shadow-gray-400/30 p-6 ">
            <div className="text-center mb-8 lg:hidden">
              <div className="w-48 h-48 flex items-center justify-center mx-auto mb-6 rounded-full shadow-lg shadow-blue-200 p-6 bg-white">
                <img src="/decimalestock.png" alt="Logo Decimale Stock" className="w-36 h-36 object-contain rounded-full" />
              </div>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">Accedez à votre espace client</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="adresse mail"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={20} />
                    Se connecter
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
  );
}