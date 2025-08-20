import React from 'react';
import { Article } from '../types';
import { Package, MapPin, AlertTriangle, Edit2, Trash2, Printer } from 'lucide-react';

interface ArticleCardProps {
  article: Article;
  onEdit?: (article: Article) => void;
  onDelete?: (id: string) => void;
  onPrintLabel: (article: Article) => void;
}

export function ArticleCard({ article, onEdit, onDelete, onPrintLabel }: ArticleCardProps) {
  const isLowStock = article.quantiteStock <= article.seuilMinimum;

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 transition-all hover:shadow-lg ${
      isLowStock ? 'border-l-4 border-orange-500' : ''
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{article.nom}</h3>
          <p className="text-sm text-gray-600">{article.categorie}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPrintLabel(article)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Imprimer étiquette"
          >
            <Printer size={16} />
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(article)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Modifier"
            >
              <Edit2 size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(article.id)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Package size={16} />
          <span>Stock: </span>
          <span className={`font-semibold ${isLowStock ? 'text-orange-600' : 'text-green-600'}`}>
            {article.quantiteStock}
          </span>
          {isLowStock && (
            <div className="flex items-center gap-1 text-orange-600">
              <AlertTriangle size={14} />
              <span className="text-xs">Seuil atteint</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin size={16} />
          <span>{article.localisation}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Fournisseur: {article.fournisseur}</span>
          <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
            {article.codeBarres}
          </div>
        </div>
      </div>
    </div>
  );
}