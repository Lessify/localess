# Migrating from a Firebase install

> Related: [Deployment Overview](overview.md) · [Docker](docker.md) · [Updates & Backups](updates.md) · Design: [firebase-space-import.md](../roadmap/firebase-space-import.md)

Spaces move one at a time from a running Firebase-era Localess environment, from the admin UI.

1. **Firebase environment:** deploy the version with the migration API, then Admin → Settings → Migration →
   *Generate token*. Copy it (it is shown once).
2. **This install:** Admin → Spaces → *Import from Firebase*. Enter the Firebase environment's URL and the token,
   *Connect*, pick a space, *Import*. Follow the stages; warnings (files missing in Firebase, references to deleted
   documents, unreadable data) are listed per stage.
3. Repeat for each space. A space can be imported once; to repeat an import, delete the imported space first.
   A failed import leaves its space flagged *Import failed* with the failing stage; delete it and import again.
4. **After each import:** publish the space's content and translations, re-invite users, re-enable the webhooks
   (they are imported disabled), and update your SDK configuration: the new origin and the new space id. API tokens
   keep their values.
5. **Old asset URLs:** they keep working if the old host now points at this install (a custom domain you move with
   DNS); `/api/v1/spaces/<old space id>/assets/<old asset id>` redirects (301) to the new URL. On the default Firebase
   domains, keep the Firebase environment running as long as old asset URLs are in use.
6. Revoke the migration token in the Firebase environment when you are done.

Not imported: users, global settings, published snapshots (publish again), webhook logs, tasks.
