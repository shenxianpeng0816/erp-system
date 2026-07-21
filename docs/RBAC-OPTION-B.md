# Option B: RuoYi-style RBAC (keep Spring Boot 3 + Next.js)

## What changed

- Kept existing `user` table and JWT login (mobile compatible via `role` field).
- Added RuoYi-style tables: `sys_role`, `sys_menu`, `sys_user_role`, `sys_role_menu`.
- Login / `getInfo` returns `roles`, `permissions`, `menus` in addition to legacy `role` + `token`.
- Controllers use `@PreAuthorize("@ss.hasPermi('erp:...')")` aligned with seeded button permissions.
- Next.js Sidebar renders from `menus`; `usePermission` / `<Permi>` for buttons.
- Pages: `/roles` (assign menus), `/users` (multi-role).

## Apply migration

Run in order (v2 alone is enough if tables already exist from v1):

```bash
mysql -u root -p erp_db < backend/src/main/resources/db/migration_rbac.sql
mysql -u root -p erp_db < backend/src/main/resources/db/migration_rbac_v2_controller_perms.sql
```

`migration_rbac_v2_controller_perms.sql` rebuilds full menu/button catalog and `sys_role_menu` from former Controller role sets (ADMIN / SALES / FINANCE / WAREHOUSE / INBOUND).

After migrate: restart backend and **re-login** so permissions reload.

## Key APIs

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/login | Login + menus/permissions |
| GET | /auth/getInfo | Refresh roles/menus |
| GET | /auth/getRouters | Sidebar tree |
| GET | /system/roles | List roles |
| PUT | /system/roles/{id}/menus | Assign menus |
| GET | /system/menus/tree | Full menu tree |
| PUT | /system/users/{id}/roles | Assign roles |
| PUT | /users/{id} | Also accepts `roleIds` |

## Frontend usage

```tsx
import { Permi } from '@/hooks/usePermission'

<Permi permission="erp:order:add">
  <button>New order</button>
</Permi>
```

## Permission catalog (Controller ↔ seed)

| Module | Permission | Typical roles (seed) |
|--------|------------|----------------------|
| Dashboard | `erp:dashboard:view` | all |
| Orders | `erp:order:list` (menu), `list:mine`, `list:all`, `add`, `edit`, `approve`, `remove`, `cancel`, `pending`, `confirm` | SALES / WAREHOUSE+INBOUND (list:all) / ADMIN |
| Outbound | `erp:outbound:list`, `export`, `print`, `ship` | WAREHOUSE, INBOUND, ADMIN |
| Inbound | `erp:inbound:list`, `export`, `query`, `add`, `edit`, `confirm`, `reject`, `remove` | WAREHOUSE, INBOUND, ADMIN (`remove` ADMIN) |
| Finance | `erp:finance:list` (menu), `invoice:list`, `receivable:list`, `receivable:export`, `pay`, `pay:edit` | FINANCE, ADMIN |
| Inventory | `erp:inventory:list` (menu), `alert`, `log`, `transaction`, `product:add/edit/remove` | WAREHOUSE/INBOUND (+ FINANCE log/transaction) |
| Transfer | `erp:transfer:list`, `add`, `confirm`, `cancel` | WAREHOUSE, INBOUND, ADMIN |
| Customers | `erp:customer:list` (menu), `add`, `edit`, `remove` | SALES/FINANCE add+edit; remove ADMIN |
| Users | `erp:user:list`, `edit`, `remove`, `byRole`, `operlog`, `role:edit` | ADMIN (+ `byRole` wider) |
| Roles/Menus | `erp:role:list`, `role:edit`, `menu:list` | ADMIN |
| Warehouse | `erp:warehouse:add` | ADMIN / warehouse ops as seeded |
| File | `erp:file:upload` | ADMIN, FINANCE, WAREHOUSE, INBOUND (not SALES; matches original) |

ADMIN (`role_id=1`) receives every `sys_menu` row via seed.

## Compatibility

- `user.role` ENUM still updated from primary assigned role (uppercase).
- Mobile apps that only read `role` continue to work.
- Prefer `@ss.hasPermi`; avoid new `hasRole` / `hasAnyRole` on Controllers.
