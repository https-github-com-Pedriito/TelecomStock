import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { User } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Utilisateurs par défaut pour la démo
const defaultUsers: User[] = [
  {
    id: '1',
    nom: 'Admin Principal',
    email: 'admin@telecom.com',
    role: 'ADMIN',
    createdAt: new Date(),
    isActive: true,
  },
  {
    id: '2',
    nom: 'Manager Stock',
    email: 'manager@telecom.com',
    role: 'MANAGER',
    createdAt: new Date(),
    isActive: true,
  },
  {
    id: '3',
    nom: 'Technicien Terrain',
    email: 'technicien@telecom.com',
    role: 'TECHNICIEN',
    createdAt: new Date(),
    isActive: true,
  },
];

export function useAuth() {
  const [users, setUsers] = useLocalStorage<User[]>('users', defaultUsers);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('currentUser', null);

  const login = useCallback((email: string, password: string) => {
    // Simulation d'authentification (mot de passe = "password" pour tous)
    if (password !== 'password') {
      throw new Error('Mot de passe incorrect');
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    setCurrentUser(user);
    return user;
  }, [users, setCurrentUser]);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, [setCurrentUser]);

  const addUser = useCallback((userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: uuidv4(),
      createdAt: new Date(),
      isActive: true,
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  }, [setUsers]);

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(user => 
      user.id === id ? { ...user, ...updates } : user
    ));
  }, [setUsers]);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(user => user.id !== id));
  }, [setUsers]);

  const hasPermission = useCallback((permission: string) => {
    if (!currentUser) return false;

    const permissions = {
      ADMIN: [
        'view_dashboard',
        'manage_articles',
        'view_articles',
        'manage_mouvements',
        'view_mouvements',
        'use_scanner',
        'view_historique',
        'manage_users',
        'view_inventory',
        'manage_inventory'
      ],
      MANAGER: [
        'view_dashboard',
        'view_articles',
        'manage_mouvements',
        'view_mouvements',
        'use_scanner',
        'view_inventory',
        'manage_inventory'
      ],
      TECHNICIEN: [
        'use_scanner',
        'manage_mouvements'
      ]
    };

    return permissions[currentUser.role]?.includes(permission) || false;
  }, [currentUser]);

  return {
    users,
    currentUser,
    isAuthenticated: !!currentUser,
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    hasPermission,
  };
}