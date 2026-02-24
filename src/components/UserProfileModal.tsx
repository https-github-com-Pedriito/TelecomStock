import React, { useState } from 'react';
import { X, Lock, User, Mail, Shield, Eye, EyeOff, Key, Fingerprint, ChevronRight, Loader2, CheckCircle2, AlertCircle, Calendar, Edit2, LogOut, CheckCircle, AlertTriangle, Camera, MapPin, Building, Smartphone, SmartphoneIcon } from 'lucide-react';
import { Portal } from './Portal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    role: 'admin' | 'manager' | 'technicien';
  };
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

export const UserProfileModal = ({ isOpen, onClose, currentUser, onChangePassword }: UserProfileModalProps) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'manager': return 'Manager';
      case 'technicien': return 'Technicien';
      default: return role;
    }
  };

  const getRoleTheme = (role: string) => {
    switch (role) {
      case 'admin': return { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' };
      case 'manager': return { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' };
      case 'technicien': return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' };
      default: return { bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500/20' };
    }
  };

  const validatePassword = () => {
    setError('');

    if (!oldPassword) {
      setError('Veuillez saisir votre mot de passe actuel');
      return false;
    }

    if (!newPassword) {
      setError('Veuillez saisir un nouveau mot de passe');
      return false;
    }

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return false;
    }

    if (newPassword === oldPassword) {
      setError('Le nouveau mot de passe doit être différent de l\'ancien');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await onChangePassword(oldPassword, newPassword);
      setSuccess('Mot de passe modifié avec succès !');

      setTimeout(() => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la modification du mot de passe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  const roleTheme = getRoleTheme(currentUser.role);

  return (
    <Portal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-950/40 backdrop-blur-md transition-opacity animate-fade-in"
          onClick={handleClose}
        />

        {/* Modal Container */}
        <div className="relative w-full max-w-lg glass rounded-[2rem] sm:rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90dvh] sm:max-h-[90vh]">

          {/* Header */}
          <div className="relative px-6 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 border-b border-white/20 dark:border-gray-800/50 flex items-center justify-between bg-blue-500/5 dark:bg-blue-950/20">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-blue-600 rounded-3xl shadow-lg shadow-blue-600/20 text-white">
                <User size={28} strokeWidth={2.5} />
              </div>
              <div>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">Espace Personnel</span>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Mon Profil</h2>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-3 hover:bg-white/40 dark:hover:bg-gray-800/40 rounded-2xl transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-90 border border-transparent hover:border-white/40"
            >
              <X size={24} strokeWidth={2.5} />
            </button>
          </div>

          {/* User Info Section */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-5 sm:p-8 space-y-6 sm:space-y-8">

              {/* Profile Hero Card */}
              <div className="glass p-6 rounded-[2rem] border border-white/40 dark:border-gray-800/50 shadow-xl relative overflow-hidden group">
                <div className="flex items-center gap-6 relative z-10">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-500">
                      {currentUser.prenom?.[0]?.toUpperCase()}{currentUser.nom?.[0]?.toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center border-2 border-blue-50 border-transparent">
                      <Fingerprint size={14} className="text-blue-500" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight truncate">
                      {currentUser.prenom} {currentUser.nom}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      <div className={`px-3 py-1 rounded-lg ${roleTheme.bg} ${roleTheme.border} border flex items-center gap-1.5`}>
                        <Shield size={10} className={roleTheme.text} strokeWidth={3} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${roleTheme.text}`}>
                          {getRoleName(currentUser.role)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                  <User size={120} />
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Détails du compte</label>
                <div className="glass p-5 rounded-2xl border border-white/40 dark:border-gray-800/50 flex items-center justify-between group hover:bg-white/40 dark:hover:bg-gray-800/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gray-500/10 rounded-xl text-gray-400">
                      <Mail size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Adresse Email</span>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{currentUser.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Change Form */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                      <Lock size={18} />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Sécurité</h3>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Feedback Messages */}
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-shake">
                      <AlertCircle size={20} className="text-red-500 shrink-0" />
                      <p className="text-xs font-bold text-red-500 tracking-tight">{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 animate-fade-in">
                      <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                      <p className="text-xs font-bold text-emerald-500 tracking-tight">{success}</p>
                    </div>
                  )}

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Mot de passe actuel</label>
                      <div className="relative group">
                        <input
                          type={showOldPassword ? 'text' : 'password'}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white shadow-inner pr-12"
                          placeholder="••••••••"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nouveau mot de passe</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white shadow-inner pr-12"
                            placeholder="••••••••"
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Confirmer</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white shadow-inner pr-12"
                            placeholder="••••••••"
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Minimum 6 caractères pour plus de sécurité</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading || !oldPassword || !newPassword || !confirmPassword}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 overflow-hidden group"
                    >
                      {isLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          <Key size={18} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                          <span>Changer le mot de passe</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 py-4 sm:py-6 border-t border-white/20 dark:border-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-white/20 dark:bg-gray-950/20 backdrop-blur-xl">
            <div className="hidden sm:flex items-center gap-3">
              <div className="p-2 bg-gray-500/10 rounded-xl">
                <Shield size={16} className="text-gray-400" />
              </div>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Données personnelles sécurisées</span>
            </div>
            <button
              onClick={handleClose}
              className="w-full sm:w-auto px-8 py-4 glass border border-white/40 dark:border-gray-800/50 rounded-2xl font-black text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3 group"
            >
              <span>Fermer le profil</span>
              <ChevronRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};
