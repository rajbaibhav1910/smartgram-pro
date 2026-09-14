# Panchayat Admin Guide

## First login

1. The platform administrator (SUPER_ADMIN) creates your Panchayat and your
   admin account from the Platform Administration panel.
2. Log in with the credentials you received. You land directly in your
   Panchayat's workspace — the header always shows
   **Panchayat: \<your Panchayat name\>** so you always know which tenant you
   are operating on.
3. You can only ever see and manage **your own Panchayat's** complaints,
   notices, and map. Attempts to open other Panchayats' data are blocked by
   the server and recorded in the platform audit log.

## Daily work

- **Operations** — live complaints for your Panchayat with analytics.
  Open a complaint to inspect details and update its status (citizens are
  notified automatically).
- **All complaints** — search, filter, sort, and page through the tenant feed.
- **Post a notice** — publish notices; they are visible only to your
  Panchayat's citizens and on your Panchayat's public notice board.
- **Village map** — add schools, water points, roads and other assets so
  citizens can find them. Assets you create belong to your Panchayat.

## Registration of citizens

Citizens select their Panchayat from the official directory during
registration. The server validates that the Panchayat exists and is active —
a citizen can never attach themselves to another Panchayat by editing the page.

## If your Panchayat is suspended

Login, complaint filing, and the public notice board are blocked by the
platform administrator. No data is ever deleted; the workspace returns to
normal once the Panchayat is reactivated.

## For platform administrators (SUPER_ADMIN)

- `/super-admin` shows platform-wide metrics, every Panchayat with its
  complaint load, and the recent audit trail.
- **Add Panchayat** creates a tenant and (optionally) its admin account in one
  step. Suspend/Activate is available per Panchayat.
- To inspect a Panchayat's operations, select it in the Operations console —
  the selection is validated and audited server-side.
