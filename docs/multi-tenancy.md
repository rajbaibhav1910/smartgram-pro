# SmartGram Pro — Multi-Panchayat (Multi-Tenant) Architecture

SmartGram Pro runs **one application serving many Gram Panchayats** with strict,
server-enforced tenant isolation. This document describes the tenant model,
authorization, data design, and security model.

## 1. Tenant model

Every Panchayat is a **tenant** with a unique, immutable `panchayatId`
(e.g. `PB001`, `PB002`). Names may change; IDs never do. Panchayats are stored
in the `SmartGramPanchayats` table with `status` `ACTIVE` or `SUSPENDED`.

There is **one** Flask application, **one** frontend bundle and **one** set of
AWS resources. Tenancy is a data + authorization concern, not an infrastructure
one (no per-Panchayat tables, buckets or clusters).

## 2. Global vs tenant data

| Entity            | Scope  | Notes |
|-------------------|--------|-------|
| Panchayat         | GLOBAL | The tenant registry itself |
| Platform config   | GLOBAL | |
| Government schemes| GLOBAL | National schemes are not duplicated per tenant |
| User              | TENANT | `super_admin` is the exception (platform scope) |
| Complaint         | TENANT | |
| Notice            | TENANT | |
| GIS asset         | TENANT | boundaries, wards, roads, infrastructure, projects |
| Ward              | TENANT | stored as GIS features (`feature_type: ward`) |
| Audit log         | TENANT (+ PLATFORM rows for super-admin actions) | |
| Platform stats    | GLOBAL aggregate (public landing counters) | |

## 3. Roles

| Role              | Scope    | Can |
|-------------------|----------|-----|
| `super_admin`     | Platform | Create/suspend Panchayats, assign Panchayat admins, view platform analytics and audit log. Must pass an explicit `?panchayatId=` (validated + audited) to inspect tenant data. |
| `panchayat_admin` | One Panchayat | Manage only their Panchayat's complaints, notices, GIS and settings. Tenant scope is implicit from their session. No Panchayat switcher. |
| `villager` (citizen) | One Panchayat | Public services for their Panchayat; own complaints only. |

Legacy accounts with role `admin` are treated as `panchayat_admin`
(`normalize_role()` in `app.py`). The optional `department_admin` role is
**not** implemented yet — the role helper is the single place to extend.

## 4. Authorization model (the security boundary)

All tenant isolation is enforced **server-side**, in `app.py`:

```
session (user_id, role, panchayatId)      ← established at login from the DB
        ↓
tenant_scope_or_error()                   ← implicit scope; super_admin may
        ↓                                    pass ?panchayatId= (validated)
resource.panchayatId
        ↓
compare → allow / 403 (+ audit event)
```

Rules enforced in code:

- `tenant_scope_or_error()` returns the caller's tenant. Ordinary admins and
  citizens **cannot** request another tenant — a client-supplied
  `?panchayatId=` is ignored for them.
- Only `super_admin` may pass an explicit `panchayatId`, and it is validated
  to exist before any data is returned.
- Direct object access (IDOR) is checked on every `GET/PUT/DELETE` by id:
  the resource's `panchayatId` must match the caller's, otherwise
  **403 + audit event** (`CROSS_TENANT_ACCESS_DENIED`).
- A client-provided `panchayatId` at registration is treated as a *selector*:
  the backend verifies the Panchayat exists and is `ACTIVE` before assigning it.
- Login refuses users without a tenant, tenants that don't exist, and
  `SUSPENDED` tenants.
- Complaint creation is citizen-only and stamped from the session.

See `docs/authorization-model.md` for the endpoint-by-endpoint matrix.

## 5. Database design

DynamoDB tables (shared, tenant-isolated via a `panchayatId` attribute and a
`PanchayatIndex` GSI):

| Table | PK | GSI | Tenant query |
|-------|----|-----|--------------|
| `SmartGramUsers` | `user_id` | UsernameIndex, **PanchayatIndex(panchayatId)** | list users of a tenant |
| `SmartGramComplaints` | `complaint_id` | **PanchayatIndex(panchayatId, submitted_at)** | tenant feed, newest first |
| `SmartGramNotices` | `notice_id` | **PanchayatIndex(panchayatId)** | tenant notices |
| `SmartGramMapAssets` | `feature_id` | **PanchayatIndex(panchayatId)** | tenant GIS |
| `SmartGramPanchayats` | `panchayatId` | — | the tenant registry |
| `SmartGramAuditLog` | `audit_id` | PanchayatIndex(panchayatId, timestamp) | tenant/platform audit |

Reads for tenant-owned data use `Query` on `PanchayatIndex` — **never** a
full-table Scan filtered in the application or the frontend.

## 6. S3 strategy

Complaint evidence lives under `complaint-images/` in the media bucket. Objects
are referenced by `image_url` on the complaint (tenant-owned), and access goes
through the app's authenticated pages. A per-tenant prefix layout
(`panchayats/PB001/...`) is the planned evolution when direct uploads arrive;
backend authorization is a prerequisite for any private-object access.

## 7. Frontend tenant context

`useAuth()` exposes `user` (including `role`, `panchayatId`) and
`panchayatName`. The admin header shows `Panchayat: <name>` so operators always
know which tenant they are working in. TanStack Query keys include the tenant
(`['dashboard', 'admin', panchayatId]`), preventing cache collisions, and
`logout()` / `login()` call `queryClient.clear()` so no data survives a user
switch. Frontend guards (`AdminRoute`, `SuperAdminRoute`) are UX only — the
backend remains the security boundary.

## 8. Super admin workflows

- `GET /api/super/overview` — platform metrics (panchayats, users, complaints, resolution rate)
- `GET /api/super/panchayats` — tenant list with complaint counts
- `POST /api/super/panchayats` — create tenant (+ optional panchayat admin credentials)
- `PUT /api/super/panchayats/:id` — activate / suspend / edit
- `GET /api/super/audit` — recent audit events
- Admin dashboards accept `?panchayatId=` **only** for super admins (implicit
  scope stays for everyone else).

## 9. Migration

`scripts/migrate_to_multitenant.py` is idempotent and additive:
creates the default Panchayat (`DEFAULT_PANCHAYAT_ID`, default `PB001`),
stamps every legacy record with it, and converts role `admin` →
`panchayat_admin`. It never deletes anything. `create_admin.py` now creates
the platform `super_admin`.

## 10. Demo data

`scripts/qa_admin_server.py` creates clearly-labeled synthetic tenants
(`PB001`/`PB002`) for local testing only. Demo data must never be presented as
real Panchayat information.
