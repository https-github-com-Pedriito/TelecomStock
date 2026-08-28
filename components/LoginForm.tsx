'use client';

import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, Mail, ArrowLeft } from 'lucide-react';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  error: string | null;
  portalUrl?: string | null;
  onBack?: () => void;
}

export function LoginForm({ onLogin, onForgotPassword, error, portalUrl, onBack }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || isLoading) return;
    setIsLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || forgotSubmitting) return;
    setForgotSubmitting(true);
    try {
      await onForgotPassword(forgotEmail);
    } catch (err) {
      console.error('Forgot password error:', err);
    } finally {
      setForgotSubmitting(false);
      setForgotSent(true);
    }
  };

  const backToLogin = () => {
    setMode('login');
    setForgotEmail('');
    setForgotSent(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors z-20"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          <span className="font-medium text-sm">Retour à l'accueil</span>
        </button>
      )}

      <div className="w-full max-w-[440px] z-10 animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-3xl shadow-xl shadow-blue-500/10 mb-6 group transition-transform hover:scale-105 overflow-hidden">
            <img
              src="/decimalestock.png"
              alt="Logo Telecom Stock"
              className="w-full h-full rounded-3xl object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Telecom Stock</h1>
          <p className="text-gray-500 dark:text-gray-400">Gérez votre inventaire avec précision</p>
        </div>

        <div className="rounded-[2.5rem] shadow-2xl shadow-gray-200/50 dark:shadow-none">
        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-10 border border-gray-100 dark:border-gray-700/50">
          {mode === 'login' ? (
            <>
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
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setMode('forgot');
                      }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
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
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-4 flex flex-col gap-2 animate-slide-up">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                    {portalUrl && (
                      <a
                        href={portalUrl}
                        className="mt-1 w-full text-center text-sm font-semibold bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl transition-colors"
                      >
                        Régulariser mon abonnement →
                      </a>
                    )}
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
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mot de passe oublié</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {forgotSent
                    ? 'Votre demande a été transmise.'
                    : 'Indiquez votre email, votre administrateur sera averti pour réinitialiser votre accès.'}
                </p>
              </div>

              {forgotSent ? (
                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 flex items-start gap-3">
                    <Mail size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Si ce compte existe, une demande de réinitialisation a été transmise à votre administrateur. Il vous contactera pour définir un nouveau mot de passe.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={backToLogin}
                    className="w-full h-[54px] bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <ArrowLeft size={20} />
                    <span>Retour à la connexion</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                      Adresse Email
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                      placeholder="example@mail.com"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotSubmitting}
                    className="w-full h-[54px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                  >
                    {forgotSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Envoyer la demande</span>
                        <Mail size={20} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={backToLogin}
                    className="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <ArrowLeft size={16} />
                    <span>Retour à la connexion</span>
                  </button>
                </form>
              )}
            </>
          )}
        </div>
        </div>

        <div className="mt-8 text-center flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
          <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Beta Testing V1.2.0</span>
        </div>
      </div>
    </div>
  );
}