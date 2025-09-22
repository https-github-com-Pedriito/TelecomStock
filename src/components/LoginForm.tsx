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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-48 h-48 flex items-center justify-center mx-auto mb-6 rounded-full shadow-lg shadow-blue-200 p-6 bg-white">
            <img src="/decimalestock.png" alt="Logo Decimale Stock" className="w-36 h-36 object-contain rounded-full" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="votre@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
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

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3 text-center">Comptes de démonstration :</p>
          <div className="space-y-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{account.email}</p>
                <p className="text-xs text-gray-600">{account.role}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center mt-3">
            Cliquez sur un compte pour remplir automatiquement les champs
          </p>
          
          {/* Boutons de debug mobile */}
          {/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-orange-600 text-center mb-2">🔧 Débogage Mobile</p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    localStorage.removeItem('auth_token');
                    window.location.reload();
                  }}
                  className="w-full text-xs bg-red-100 text-red-700 p-2 rounded hover:bg-red-200 transition-colors"
                >
                  🗑️ Effacer session et recharger
                </button>
                <button
                  onClick={() => {
                    const httpUrl = window.location.href.replace('https:', 'http:').replace(':5174', ':3080');
                    window.location.href = httpUrl;
                  }}
                  className="w-full text-xs bg-blue-100 text-blue-700 p-2 rounded hover:bg-blue-200 transition-colors"
                >
                  🔄 Essayer en HTTP (port 3080)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}