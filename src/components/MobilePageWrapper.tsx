import React from 'react';

interface MobilePageWrapperProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Wrapper pour les pages en mode mobile
 * Assure une largeur correcte et évite le scroll horizontal
 */
export function MobilePageWrapper({ 
  children, 
  title, 
  actions,
  className = '' 
}: MobilePageWrapperProps) {
  return (
    <div className={`w-full h-full overflow-x-hidden overflow-y-auto ${className}`}>
      {/* Bannière BETA pour mobile */}
      <div className="md:hidden bg-black/95 backdrop-blur-xl border-b border-purple-500/30 sticky top-0 z-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-blue-600/10 animate-pulse"></div>
        <div className="relative py-1.5 px-4 flex items-center justify-center gap-2">
          <span className="relative inline-flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75 animate-ping"></span>
            <span className="relative inline-flex items-center justify-center px-2.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold text-[10px] tracking-widest text-white shadow-lg shadow-purple-500/50">
              BETA
            </span>
          </span>
          <span className="text-[10px] text-white/70 font-medium">
            Version de test
          </span>
        </div>
      </div>
      
      {/* Header de page (optionnel) */}
      {(title || actions) && (
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-[34px] md:top-0 z-10">
          {title && (
            <h1 className="text-lg font-semibold text-gray-900 truncate flex-1">
              {title}
            </h1>
          )}
          {actions && (
            <div className="flex items-center space-x-2 ml-2">
              {actions}
            </div>
          )}
        </div>
      )}
      
      {/* Contenu de la page */}
      <div className="w-full px-4 py-4 max-w-full">
        {children}
      </div>
    </div>
  );
}

/**
 * Carte responsive pour mobile
 */
export function MobileCard({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 w-full max-w-full ${className}`}>
      {children}
    </div>
  );
}

/**
 * Grille responsive pour mobile
 */
export function MobileGrid({ 
  children, 
  columns = 1,
  gap = 4,
  className = '' 
}: { 
  children: React.ReactNode;
  columns?: 1 | 2;
  gap?: number;
  className?: string;
}) {
  return (
    <div className={`grid gap-${gap} w-full max-w-full ${
      columns === 2 ? 'grid-cols-2' : 'grid-cols-1'
    } ${className}`}>
      {children}
    </div>
  );
}

/**
 * Liste responsive pour mobile
 */
export function MobileList({ 
  children,
  className = ''
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-3 w-full max-w-full ${className}`}>
      {children}
    </div>
  );
}

/**
 * Élément de liste responsive
 */
export function MobileListItem({ 
  children,
  onClick,
  className = ''
}: { 
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const baseClasses = "bg-white rounded-lg shadow-sm border border-gray-200 p-4 w-full max-w-full";
  const clickableClasses = onClick ? "cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors" : "";
  
  return (
    <div 
      className={`${baseClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Bouton d'action flottant (FAB) pour mobile
 */
export function MobileFAB({ 
  onClick,
  icon,
  label,
  className = ''
}: { 
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-20 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-40 flex items-center ${
        label ? 'px-4 py-3' : 'w-14 h-14'
      } ${className}`}
      title={label}
    >
      <span className={label ? 'mr-2' : ''}>
        {icon}
      </span>
      {label && <span className="font-medium text-sm">{label}</span>}
    </button>
  );
}

/**
 * Barre d'actions sticky pour mobile
 */
export function MobileActionBar({ 
  children,
  className = ''
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-2 z-10 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Tableau responsive qui devient des cartes sur mobile
 */
export function MobileTable<T>({ 
  data,
  renderRow,
  onRowClick,
  emptyMessage = "Aucune donnée"
}: { 
  data: T[];
  renderRow: (item: T) => React.ReactNode;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full max-w-full">
      {data.map((item, index) => (
        <div
          key={index}
          className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 w-full max-w-full ${
            onRowClick ? 'cursor-pointer hover:bg-gray-50 active:bg-gray-100' : ''
          }`}
          onClick={() => onRowClick?.(item)}
        >
          {renderRow(item)}
        </div>
      ))}
    </div>
  );
}
