'use client';
import { useAuth } from '@/hooks/useAuth';
import { useStock } from '@/hooks/useStock';
import { useNotifications } from '@/components/Notification';
import { Articles } from '@/src-pages/Articles';
import { Article } from '@/types';

export default function ArticlesPage() {
  const { user } = useAuth();
  const { articles, fournisseurs, createArticle, updateArticle, deleteArticle } = useStock(user ?? null);
  const { addNotification } = useNotifications();

  const hasPermission = (permission: string) => {
    if (!user) return false;
    const role = user.role.toLowerCase();
    if (permission === 'edit_articles') return role === 'admin' || role === 'manager';
    if (permission === 'delete_articles') return role === 'admin';
    return true;
  };

  const handleAdd = (data: Omit<Article, 'id' | 'created_at' | 'updated_at'>): Article => {
    void createArticle(data);
    return { id: 'temp_' + Date.now(), ...data, created_at: new Date(), updated_at: new Date() };
  };

  if (!user) return null;
  return (
    <Articles
      articles={articles}
      hasPermission={hasPermission}
      fournisseurs={fournisseurs}
      onAddArticle={handleAdd}
      onUpdateArticle={updateArticle}
      onDeleteArticle={deleteArticle}
      addNotification={addNotification}
    />
  );
}
