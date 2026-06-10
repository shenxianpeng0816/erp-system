# ERP Sales Management System

> Solar equipment sales & inventory management system — Kenya market

## Project Structure

```
erp-system/
├── backend/          # Java 17 / Spring Boot 3.2 / MyBatis-Plus
├── web/              # Next.js PC management interface (print-optimized)
└── mobile/           # React Native (Expo) mobile app (entry / approval / field)
```

---

## Backend Startup

### 1. Configure Database

Edit `backend/src/main/resources/application.yml`:

```yaml
spring.datasource.username: your_mysql_user
spring.datasource.password: your_mysql_password
```

### 2. Initialise Database (first time)

```bash
mysql -u root -p < backend/src/main/resources/db/schema.sql
```

> **Existing database migration:** If you already ran the old schema, apply only the new table:
>
> ```bash
> mysql -u root -p erp_db < backend/src/main/resources/db/sequence.sql
> ```

### 3. Start

```bash
cd backend
mvn spring-boot:run
```

Service runs at `http://localhost:8080/api`

### 4. Default Account

| Username | Password  | Role  |
| -------- | --------- | ----- |
| admin    | Admin@123 | ADMIN |

---

## Web (PC) App Startup

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000`

> For production, set `NEXT_PUBLIC_API_BASE=http://your-server:8080/api` in `.env.local`

---

## Mobile App Startup

### Configure API base

Edit `mobile/contexts/AuthContext.tsx`, change `API_BASE` to your server IP:

```ts
export const API_BASE = 'http://192.168.x.x:8080/api';
```

### Install & Start

```bash
cd mobile
npm install
npx expo start
```

---

## Platform Split

| Function                            | Platform                  |
| ----------------------------------- | ------------------------- |
| Create order                        | Mobile + Web              |
| Order approval                      | Mobile + Web              |
| Confirm delivery / upload signature | Mobile                    |
| Print Delivery Note                 | Web (browser print → PDF) |
| Print Invoice                       | Web (browser print → PDF) |
| Finance (receivables, payment)      | Web                       |
| Inventory management                | Web                       |
| Inbound management                  | Web                       |
| Reports                             | Web                       |

---

## Main API Endpoints

| Method | Path                          | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| POST   | /auth/login                   | Login, returns JWT                   |
| GET    | /customers/search?keyword\=   | Customer autocomplete                |
| GET    | /orders                       | All orders (ADMIN/FINANCE/WAREHOUSE) |
| GET    | /orders/mine                  | My orders (SALES)                    |
| GET    | /orders/pending               | Pending approval only (ADMIN)        |
| POST   | /orders                       | Create sales order (DRAFT)           |
| POST   | /orders/{id}/submit           | Submit for approval                  |
| POST   | /orders/{id}/approval         | Approve / Reject / Redirect          |
| GET    | /orders/{id}/items            | Order items with product names       |
| GET    | /orders/{id}/approvals        | Approval history                     |
| POST   | /orders/{id}/confirm          | Confirm delivery                     |
| GET    | /outbound                     | Outbound orders list                 |
| GET    | /outbound/{id}/items          | Outbound items with product names    |
| POST   | /outbound/{id}/ship           | Execute outbound (deducts inventory) |
| GET    | /inbound                      | Inbound orders list                  |
| POST   | /inbound                      | Create inbound order                 |
| POST   | /inbound/{id}/confirm         | Confirm inbound (adds to inventory)  |
| GET    | /finance/invoices             | Invoice list                         |
| POST   | /finance/receivables/{id}/pay | Record payment                       |
| GET    | /inventory                    | Inventory list                       |
| GET    | /inventory/alerts             | Low-stock alerts                     |

---

## Core Business Flow

```
Sales creates order → Submits for approval
       ↓
Admin approves (supports redirect approval)
       ↓ Approved
Auto-generates: Invoice (finance) + Delivery Note (warehouse)
       ↓
Finance records payment → Receivable updated
Warehouse ships order → Inventory deducted
       ↓
Sales confirms delivery + uploads signed proof → Order complete
```

### Special Rule: Pickup-point Split

Orders support `shipToCustomerId` ≠ `billToCustomerId`, covering the
scenario where goods are shipped to a pickup point but invoiced to a different entity.

---

## Document Numbering

Business documents use DB-backed sequences (restarts don't reset numbers):

| Prefix | Example         | Document      |
| ------ | --------------- | ------------- |
| SO     | SO202504250001  | Sales Order   |
| INV    | INV202504250001 | Invoice       |
| DN     | DN202504250001  | Delivery Note |
| IN     | IN202504250001  | Inbound Order |

Counter resets to 0001 at the start of each new day.

---

## Pending / Phase 2

- [ ] Mobile outbound page
- [ ] Mobile finance / receivables page
- [ ] Mobile inventory view
- [ ] Sales summary reports
- [ ] File upload for delivery signature
- [ ] Inventory transaction log wiring