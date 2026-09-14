# Database Tenant Model

## Design decision

The existing tables keep their natural primary keys (`complaint_id`,
`user_id`, …). Tenant isolation is added through a **`panchayatId` attribute +
a `PanchayatIndex` GSI** on each tenant-owned table, rather than a full
`PANCHAYAT#…/COMPLAINT#…` key redesign. Rationale: the access patterns are
"all X for one tenant" — exactly a GSI partition — and this preserves every
existing record and URL with an additive migration.

## Tables

### SmartGramPanchayats (GLOBAL registry)
- PK: `panchayatId` (immutable, e.g. `PB001`)
- Attributes: `name, district, state, contactEmail, contactPhone, status(ACTIVE|SUSPENDED), createdAt, updatedAt`

### SmartGramUsers (TENANT)
- PK: `user_id`
- GSI: `UsernameIndex(username)`, `PanchayatIndex(panchayatId)`
- Attributes: `role (super_admin|panchayat_admin|villager), panchayatId (null for super_admin), …`

### SmartGramComplaints (TENANT)
- PK: `complaint_id`
- GSI: `PanchayatIndex(panchayatId, submitted_at)` — tenant feed newest-first
- Attributes: `panchayatId, user_id, status, …`

### SmartGramNotices (TENANT)
- PK: `notice_id`
- GSI: `PanchayatIndex(panchayatId)`
- Attributes: `panchayatId, posted_by, …`

### SmartGramMapAssets (TENANT)
- PK: `feature_id`
- GSI: `PanchayatIndex(panchayatId)`
- Attributes: `panchayatId, feature_type (boundary|ward|school|…), geometry, properties`

### SmartGramAuditLog (TENANT + PLATFORM)
- PK: `audit_id`
- GSI: `PanchayatIndex(panchayatId, timestamp)`
- Rows for ordinary admin actions carry the tenant id; super-admin and
  cross-tenant-denial events use `panchayatId = 'PLATFORM'` or the affected
  tenant respectively.

## Access patterns

| Pattern | Access |
|---|---|
| Tenant complaint feed | `Query PanchayatIndex` PK=panchayatId, newest first |
| Citizen's own complaints | `Scan` filter `panchayatId = ? AND user_id = ?` (bounded per citizen) |
| Tenant notices / GIS | `Query PanchayatIndex` PK=panchayatId |
| Complaint by ID (IDOR-checked) | `GetItem` + application tenant check |
| Tenant user list / counts | `Query PanchayatIndex` with `Select=COUNT` |
| Platform aggregates | `Scan` (super admin / public aggregates only) |

## Migration

`scripts/migrate_to_multitenant.py` (idempotent, additive only):
1. Creates the default Panchayat (`DEFAULT_PANCHAYAT_ID`, default `PB001`).
2. Stamps `panchayatId` onto every user/complaint/notice/map row missing one.
3. Converts legacy `role: admin` → `panchayat_admin`.
4. Never deletes anything; safe to re-run.
