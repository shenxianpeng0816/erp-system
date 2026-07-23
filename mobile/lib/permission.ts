import { AuthUser } from '@/types/erp';

export function hasPermi(user: AuthUser | null | undefined, permission: string): boolean {
  if (!user) return false;
  const perms = user.permissions;
  if (perms == null) {
    return String(user.role ?? '').toUpperCase() === 'ADMIN';
  }
  return perms.includes('*:*:*') || perms.includes(permission);
}

export function hasAnyPermi(user: AuthUser | null | undefined, ...permissions: string[]): boolean {
  return permissions.some((p) => hasPermi(user, p));
}

export const MP = {
  orderAdd: 'erp:order:add',
  orderEdit: 'erp:order:edit',
  orderSubmit: 'erp:order:submit',
  orderApprove: 'erp:order:approve',
  orderConfirm: 'erp:order:confirm',
  orderCancel: 'erp:order:cancel',
  orderListMine: 'erp:order:list:mine',
  orderListAll: 'erp:order:list:all',
  orderPending: 'erp:order:pending',
  orderQuery: 'erp:order:query',
} as const;

/** Can open order detail screen (view or act on the order). */
export function canOpenOrderDetail(user: AuthUser | null | undefined): boolean {
  return hasAnyPermi(
    user,
    MP.orderQuery,
    MP.orderEdit,
    MP.orderSubmit,
    MP.orderApprove,
    MP.orderCancel,
    MP.orderConfirm,
    MP.orderPending,
  );
}
