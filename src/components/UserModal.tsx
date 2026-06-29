import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, Users, Mail, Shield, Key, ChevronRight, Fingerprint, Lock, Eye, EyeOff, UserPlus, UserCheck, BellRing } from 'lucide-react';
import { Portal } from './Portal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Omit<User, 'id' | 'created_at' | 'updated_at'>) => void;
  user?: User;
}

export function UserModal({ isOpen, onClose, onSave, user }: UserModalProps) {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    role: 'technicien' as 'admin' | 'manager' | 'technicien',
    is_active: true,
    password: '',
    confirmPassword: '',
  });

  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const validatePasswords = () => {
    const newErrors: typeof errors = {};

    if (formData.password || formData.confirmPassword) {
      if (formData.password.length > 0 && formData.password.length < 6) {
        newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (user) {
      setFormData({
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        password: '',
        confirmPassword: '',
      });
    } else {
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        role: 'technicien',
        is_active: true,
        password: '',
        confirmPassword: '',
      });
    }
    setErrors({});
    setShowPasswordFields(!!user?.reset_requested_at);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePasswords()) {
      return;
    }

    const { confirmPassword, password, ...baseData } = formData;

    const dataToSend = {
      ...baseData,
      ...(password && password.trim() !== '' ? { password } : {})
    };

    onSave(dataToSend);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-950/40 backdrop-blur-md transition-opacity animate-fade-in"
          onClick={onClose}
        />

        {/* Modal Container */}
        <div className="relative w-full max-w-lg glass rounded-[2rem] sm:rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90dvh] sm:max-h-[90vh]">

          {/* Header */}
          <div className="relative px-6 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 border-b border-white/20 dark:border-gray-800/50 flex items-center justify-between bg-blue-500/5 dark:bg-blue-950/20 overflow-hidden">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-blue-600 rounded-3xl shadow-lg shadow-blue-600/20 text-white">
                {user ? <Users size={28} strokeWidth={2.5} /> : <UserPlus size={28} strokeWidth={2.5} />}
              </div>
              <div>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">Administration</span>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  {user ? 'Modifier Profil' : 'Nouvel Utilisateur'}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-white/40 dark:hover:bg-gray-800/40 rounded-2xl transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-90 border border-transparent hover:border-white/40"
            >
              <X size={24} strokeWidth={2.5} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <form id="user-form" onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6 sm:space-y-8">

              {/* General Info */}
              <div className="space-y-5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Informations Générales</label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Prénom *</label>
                    <input
                      type="text"
                      required
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white shadow-inner"
                      placeholder="Jean"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nom *</label>
                    <input
                      type="text"
                      required
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white shadow-inner"
                      placeholder="DUPONT"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Adresse Email *</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white shadow-inner"
                      placeholder="j.dupont@entreprise.fr"
                    />
                    <Mail size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Rôle Système *</label>
                    <div className="relative">
                      <select
                        required
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                        className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none appearance-none cursor-pointer font-bold text-gray-900 dark:text-white shadow-inner"
                      >
                        <option value="technicien">Technicien</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Administrateur</option>
                      </select>
                      <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                      <Shield size={16} className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none opacity-50" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">État du compte</label>
                    <label className="flex items-center justify-between px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-transparent hover:border-blue-500/20 shadow-inner group">
                      <span className={`text-xs font-black uppercase tracking-widest ${formData.is_active ? 'text-blue-500' : 'text-gray-400'}`}>
                        {formData.is_active ? 'Activé' : 'Désactivé'}
                      </span>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 transition-all shadow-inner"></div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-5 pt-4 border-t border-white/20 dark:border-gray-800/50">
                {user?.reset_requested_at && (
                  <div className="glass p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 flex items-start gap-4 ring-1 ring-amber-500/20 animate-slide-up">
                    <div className="p-2 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-500/20">
                      <BellRing size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Demande de réinitialisation</p>
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-300">
                        Envoyée le {format(new Date(user.reset_requested_at), 'dd MMM yyyy à HH:mm', { locale: fr })}. Définissez un nouveau mot de passe ci-dessous pour la résoudre.
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                      <Lock size={18} />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Sécurité</h3>
                  </div>
                  {user && (
                    <button
                      type="button"
                      onClick={() => setShowPasswordFields(!showPasswordFields)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showPasswordFields
                        ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                        : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
                        }`}
                    >
                      {showPasswordFields ? 'Annuler modification' : 'Changer mot de passe'}
                    </button>
                  )}
                </div>

                {(!user || showPasswordFields) && (
                  <div className="space-y-5 animate-slide-up">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                          {user ? 'Nouveau password' : 'Mot de passe *'}
                        </label>
                        <div className="relative group">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => {
                              setFormData({ ...formData, password: e.target.value });
                              if (errors.password) setErrors({ ...errors, password: undefined });
                            }}
                            onBlur={validatePasswords}
                            className={`w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white shadow-inner pr-12 ${errors.password ? 'border-red-500/50' : 'border-transparent focus:border-blue-500/50'
                              }`}
                            placeholder="••••••••"
                            required={!user}
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Confirmation *</label>
                        <div className="relative group">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={(e) => {
                              setFormData({ ...formData, confirmPassword: e.target.value });
                              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                            }}
                            onBlur={validatePasswords}
                            className={`w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white shadow-inner pr-12 ${errors.confirmPassword ? 'border-red-500/50' : 'border-transparent focus:border-blue-500/50'
                              }`}
                            placeholder="••••••••"
                            required={!user || formData.password !== ''}
                            minLength={6}
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

                    {/* Password Feedback */}
                    {(errors.password || errors.confirmPassword) && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-shake">
                        <AlertCircle size={20} className="text-red-500 shrink-0" />
                        <p className="text-xs font-bold text-red-500 tracking-tight">
                          {errors.password || errors.confirmPassword}
                        </p>
                      </div>
                    )}

                    {!user && (
                      <div className="glass p-4 rounded-2xl border border-blue-500/10 bg-blue-500/5 flex items-start gap-4 ring-1 ring-blue-500/10">
                        <div className="p-2 bg-blue-500 rounded-xl text-white shadow-lg shadow-blue-500/20">
                          <Fingerprint size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Information Sécurité</p>
                          <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 leading-relaxed uppercase tracking-tighter">
                            Une politique de minimum 6 caractères est requise. L'utilisateur pourra redéfinir son accès ultérieurement.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {user && !showPasswordFields && (
                  <div className="glass p-5 rounded-2xl border border-white/40 dark:border-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-4 group hover:bg-white/40 dark:hover:bg-gray-800/20 transition-all opacity-80">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-gray-500/10 rounded-xl text-gray-400 group-hover:bg-blue-500/5 group-hover:text-blue-400 transition-all">
                        <Key size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Accès actuel</span>
                        <span className="text-xs font-bold text-gray-500 uppercase">Mot de passe inchangé</span>
                      </div>
                    </div>
                    <Lock size={14} className="text-gray-300" />
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Footer Actions */}
          <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-white/20 dark:border-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-white/20 dark:bg-gray-950/20 backdrop-blur-xl overflow-hidden h-24">
            <div className="hidden sm:flex items-center gap-3">
              <div className="p-2 bg-gray-500/10 rounded-xl">
                <UserCheck size={16} className="text-gray-400" />
              </div>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Validation de sécurité</span>
            </div>

           
            <div className="flex items-center gap-3 w-full sm:w-[320px] h-full overflow-hidden">
              <button
                type="button"
                onClick={onClose}
                className="p-3 glass border border-white/40 dark:border-gray-800/50 rounded-2xl font-black text-[10px] text-gray-500 uppercase tracking-widest hover:text-gray-900 dark:hover:text-white transition-all active:scale-95 flex-1"
              >
                Annuler
              </button>
              <button
                form="user-form"
                type="submit"
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-3 transition-all group flex-1 overflow-hidden"
              >
                <span>{user ? 'Appliquer' : 'Enregistrer'}</span>
                <ChevronRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// Sub-components helpers
function AlertCircle({ size, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
