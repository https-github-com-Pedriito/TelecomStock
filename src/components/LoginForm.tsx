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
    if (!email || !password) return;
    try {
      await onLogin(email, password);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[440px] z-10 animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-blue-500/10 mb-6 group transition-transform hover:scale-105">
            <img
              src="/decimalestock.png"
              alt="Logo Decimale Stock"
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Decimale Stock</h1>
          <p className="text-gray-500 dark:text-gray-400">Gérez votre inventaire avec précision</p>
        </div>

        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-gray-200/50 dark:shadow-none p-8 sm:p-10 border border-gray-100 dark:border-gray-700/50">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bon retour</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Connectez-vous pour commencer</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                Adresse Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                placeholder="example@mail.com"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Mot de passe
                </label>
                <button type="button" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  Oublié ?
                </button>
              </div>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 flex items-center gap-3 animate-slide-up">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[54px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Se connecter</span>
                  <LogIn size={20} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
          <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Beta Testing V1.2.0</span>
        </div>
      </div>
    </div>
  );
}