# Authorization Model

## Roles

| Role | Assigned by | Scope |
|------|-------------|-------|
| `super_admin` | `create_admin.py` (platform seed) | Platform. May access a tenant explicitly via validated `?panchayatId=` — always audited. |
| `panchayat_admin` | Super Admin panel, or migration script (legacy `admin`) | Exactly one `panchayatId`. Implicit tenant scope. |
| `villager` | Self-registration (validated Panchayat selector) | Exactly one `panchayatId`. Own data + tenant public data. |

Legacy `admin` role is normalized to `panchayat_admin` at login and in
`/api/auth/me` (`normalize_role()`).

## Endpoint matrix

| Endpoint | Anonymous | villager | panchayat_admin | super_admin |
|---|---|---|---|---|
| `GET /api/panchayats` | ACTIVE list (id, name, district) | same | same | same |
| `POST /api/auth/register` | ✓ (valid, ACTIVE panchayatId required) | — | — | — |
| `GET /api/auth/me` | 401 | own | own | own |
| `GET /api/stats` | platform aggregates | same | same | same |
| `GET /api/complaints` | 401 | own complaints in own tenant | tenant query (GSI) | all, or `?panchayatId=` scope |
| `POST /api/complaints` | 401 | own tenant (ACTIVE check) | 403 | 403 |
| `GET /api/complaints/:id` | 401 | own + tenant match else **403+audit** | tenant match else **403+audit** | allowed (audited) |
| `PUT /api/complaints/:id/status` | 403 | 403 | tenant match else **403+audit** | allowed (audited) |
| `GET /api/notices` | `?p=` required, tenant must be ACTIVE | own tenant | own tenant | platform (empty list) |
| `POST /api/notices` | 403 | 403 | stamped with own tenant | 403 (no tenant) |
| `GET /api/map/features` | 401 | own tenant | own tenant | all, or `?panchayatId=` |
| `POST/PUT/DELETE /api/map/features/:id` | 401/403 | 403 | own tenant else **403+audit** | allowed |
| `GET /api/dashboard/citizen` | 401 | own tenant + own complaints | — | — |
| `GET /api/dashboard/admin` | 403 | 403 | own tenant (GSI query) | `?panchayatId=` required for tenant data |
| `GET/POST/PUT /api/super/*` | 403 | 403 | 403 | super_admin only |

`403+audit` = HTTP 403 with a `CROSS_TENANT_ACCESS_DENIED` audit event
(actor, actor tenant, requested resource, timestamp).

## Invariants

1. Tenant scope is derived from the **session**, which is derived from the
   database at login — never from URL, body, or localStorage.
2. Every create stamps `panchayatId` from the session.
3. Every read/update/delete by id verifies `resource.panchayatId`.
4. Cross-tenant attempts are denied **and logged**.
5. Suspended tenants block login, complaint creation, and public content.
