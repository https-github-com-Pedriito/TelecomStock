export const hasPermissionFn = (role: string, permission: string): boolean => {
  const r = role.toLowerCase();
  if (r === 'super_admin') return true;
  switch (permission) {
    case 'view_dashboard':
    case 'manage_users':
      return r === 'admin';
    case 'edit_articles':
      return r === 'admin' || r === 'manager';
    case 'delete_articles':
      return r === 'admin';
    case 'view_articles':
      return ['admin', 'manager', 'technicien'].includes(r);
    case 'view_prices':
      return r === 'admin' || r === 'manager';
    case 'manage_articles':
      return r === 'admin' || r === 'manager';
    case 'view_mouvements':
    case 'view_historique':
    case 'view_inventory':
      return ['admin', 'manager'].includes(r);
    case 'use_scanner':
      return ['admin', 'manager', 'technicien'].includes(r);
    default:
      return false;
  }
};

export function getDefaultRouteForRole(role: string): string {
  return hasPermissionFn(role, 'view_dashboard') ? '/dashboard' : '/articles';
}
