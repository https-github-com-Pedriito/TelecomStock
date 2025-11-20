import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, Users } from 'lucide-react';

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
    // Réinitialiser les erreurs et l'état d'affichage des mots de passe
    setErrors({});
    setShowPasswordFields(false);
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des mots de passe
    if (!validatePasswords()) {
      return;
    }
    
    // Préparer les données à envoyer
    const { confirmPassword, password, ...baseData } = formData;
    
    // Construire l'objet final
    const dataToSend = {
      ...baseData,
      ...(password && password.trim() !== '' ? { password } : {})
    };
    
    onSave(dataToSend);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom complet *
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prénom *
            </label>
            <input
              type="text"
              value={formData.prenom}
              onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rôle *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'manager' | 'technicien' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              required
            >
              <option value="technicien">Technicien</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-700 rounded focus:ring-blue-500 bg-white dark:bg-gray-900"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
              Compte actif
            </label>
          </div>

          {/* Section mot de passe */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {user ? 'Modifier le mot de passe' : 'Mot de passe'}
              </h3>
              {user && (
                <button
                  type="button"
                  onClick={() => setShowPasswordFields(!showPasswordFields)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                >
                  {showPasswordFields ? 'Annuler' : 'Changer le mot de passe'}
                </button>
              )}
            </div>

            {(!user || showPasswordFields) && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {user ? 'Nouveau mot de passe' : 'Mot de passe'} {!user && '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      // Réinitialiser les erreurs quand l'utilisateur tape
                      if (errors.password) {
                        setErrors({ ...errors, password: undefined });
                      }
                    }}
                    onBlur={validatePasswords}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${
                      errors.password ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-gray-700'
                    }`}
                    placeholder={user ? 'Laisser vide pour ne pas changer' : ''}
                    required={!user}
                    minLength={6}
                  />
                  {errors.password && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirmer le mot de passe {!user && '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value });
                      // Réinitialiser les erreurs quand l'utilisateur tape
                      if (errors.confirmPassword) {
                        setErrors({ ...errors, confirmPassword: undefined });
                      }
                    }}
                    onBlur={validatePasswords}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${
                      errors.confirmPassword ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-gray-700'
                    }`}
                    placeholder={user ? 'Confirmer le nouveau mot de passe' : 'Confirmer le mot de passe'}
                    required={!user || formData.password !== ''}
                    minLength={6}
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            )}

            {user && !showPasswordFields && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Le mot de passe actuel sera conservé
                </p>
              </div>
            )}

            {!user && (
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg mt-3">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Exigences :</strong> Au moins 6 caractères
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  L'utilisateur pourra le changer lors de sa première connexion
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg transition-colors"
            >
              {user ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}