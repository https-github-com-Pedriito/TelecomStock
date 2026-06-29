import React, { useState, useEffect } from 'react';
import { Fournisseur } from '../types';
import { Truck, X, Building2, User, Mail, Phone, MapPin, ChevronRight } from 'lucide-react';
import { Portal } from './Portal';

interface FournisseurModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fournisseur: Omit<Fournisseur, 'id' | 'createdAt' | 'updatedAt'>) => void;
  fournisseur?: Fournisseur;
}

export function FournisseurModal({ isOpen, onClose, onSave, fournisseur }: FournisseurModalProps) {
  const [formData, setFormData] = useState({
    nom: '',
    contact: '',
    email: '',
    telephone: '',
    adresse: '',
  });

  useEffect(() => {
    if (fournisseur) {
      setFormData({
        nom: fournisseur.nom || '',
        contact: fournisseur.contact || '',
        email: fournisseur.email || '',
        telephone: fournisseur.telephone || '',
        adresse: fournisseur.adresse || '',
      });
    } else {
      setFormData({
        nom: '',
        contact: '',
        email: '',
        telephone: '',
        adresse: '',
      });
    }
  }, [fournisseur]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
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
        <div className="relative w-full max-w-xl glass rounded-[2rem] sm:rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[82dvh] sm:max-h-[90vh]">

          {/* Header */}
          <div className="relative px-6 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 border-b border-white/20 dark:border-gray-800/50 flex items-center justify-between bg-blue-500/5 dark:bg-blue-950/20">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-blue-600 rounded-3xl shadow-lg shadow-blue-600/20">
                <Truck size={28} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  {fournisseur ? 'Détails Partenaire' : 'Nouveau Fournisseur'}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gestion Logistique</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/40 dark:hover:bg-gray-800/40 rounded-xl transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-90"
            >
              <X size={24} strokeWidth={2.5} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-8 space-y-6 sm:space-y-8 custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* 1. Identity Card */}
              <div className="glass p-5 sm:p-6 rounded-3xl border border-white/40 dark:border-gray-800/50 shadow-sm space-y-4 sm:space-y-5">
                <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                  <Building2 size={18} strokeWidth={3} />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Identité de l'Entreprise</h3>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Raison Sociale *</label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 focus:bg-white dark:focus:bg-gray-800 rounded-2xl outline-none transition-all font-bold text-lg text-gray-900 dark:text-white placeholder:text-gray-400 shadow-inner"
                    placeholder="EX: Telecom Solutions Inc."
                  />
                </div>
              </div>

              {/* 2. Contact Details Card */}
              <div className="glass p-5 sm:p-6 rounded-3xl border border-white/40 dark:border-gray-800/50 shadow-sm space-y-5 sm:space-y-6">
                <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                  <User size={18} strokeWidth={3} />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Contact & Communication</h3>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Responsable *</label>
                    <div className="relative group">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        required
                        value={formData.contact}
                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                        className="w-full pl-12 pr-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white shadow-inner"
                        placeholder="Nom du contact..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Email *</label>
                      <div className="relative group">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-12 pr-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white shadow-inner"
                          placeholder="contact@email.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Téléphone *</label>
                      <div className="relative group">
                        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="tel"
                          required
                          value={formData.telephone}
                          onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                          className="w-full pl-12 pr-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white shadow-inner"
                          placeholder="+33..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Adresse Siège *</label>
                    <div className="relative group">
                      <MapPin size={18} className="absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <textarea
                        required
                        value={formData.adresse}
                        onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                        className="w-full pl-12 pr-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white shadow-inner min-h-[100px]"
                        placeholder="Adresse complète du siège social..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Footer Actions */}
          <div className="px-4 sm:px-8 py-3 sm:py-6 border-t border-white/20 dark:border-gray-800/50 flex flex-row items-center justify-between gap-3 bg-white/20 dark:bg-gray-950/20 backdrop-blur-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 sm:px-8 py-3 sm:py-4 glass border border-white/40 dark:border-gray-800/50 rounded-2xl font-black text-sm sm:text-base text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95 shrink-0"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center justify-center gap-2 px-5 sm:px-10 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all group"
            >
              <span>{fournisseur ? 'Mettre à jour' : 'Enregistrer le Partenaire'}</span>
              <ChevronRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
