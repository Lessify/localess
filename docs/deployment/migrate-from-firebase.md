# Migrating from a Firebase install

> Related: [Deployment Overview](overview.md) · [Docker](docker.md) · [Updates & Backups](updates.md) · Design: [firebase-space-import.md](../roadmap/firebase-space-import.md)

Spaces move one at a time from a running Firebase-era Localess environment, from the admin UI.

1. **Firebase environment:** deploy the version with the migration API, then Admin → Settings → Migration →
   *Generate token*. Copy it (it is shown once).
2. **This install:** Admin → Spaces → *Import from Firebase*. Enter the Firebase environment's URL and the token,
   *Connect*, pick a space, *Import*. Follow the stages; warnings (files missing in Firebase, references to deleted
   documents, unreadable data, locales this install does not know, which are skipped, schema fields that are not valid,
   which are dropped) are listed per stage.
3. Repeat for each space. A space can be imported once; to repeat an import, delete the imported space first.
   A failed import leaves its space flagged *Import failed* with the failing stage; delete it and import again.
   A running import can be stopped with *Cancel import* (in the import dialog or in **Imports**): it ends as failed
   at the stage it reached ("Cancelled by <email>"), and its space is deleted and imported again like any failed one.
4. **After each import:** publish the space's content and translations, re-invite users, re-enable the webhooks
   (they are imported disabled), and update your SDK configuration: the new origin, the new space id and new tokens.
   API tokens are **not imported**: each imported space gets an *Auto Generated Preview Token*; create Public and
   Management tokens in Space Settings → Tokens, then update your sites (`?token=`) and CI (`localess login`).
5. **Old asset URLs:** they keep working if the old host now points at this install (a custom domain you move with
   DNS); `/api/v1/spaces/<old space id>/assets/<old asset id>` redirects (301) to the new URL. On the default Firebase
   domains, keep the Firebase environment running as long as old asset URLs are in use.
   Best switch the domain after the import has finished. If traffic arrives earlier, nothing is cached as broken:
   an old space id this install doesn't know yet answers `404` with `Cache-Control: no-cache`, and every
   `/api/v1/spaces/…` request of a space that is importing (or whose import failed) answers `503` with
   `Retry-After: 60` and `Cache-Control: no-store`, until the import has finished.
   A failed import is not resumed: delete the space it created (Admin → Spaces, marked *Import failed*), which also
   removes the run, then import the space again.
6. **What the import changes**, each listed as a warning of its stage:
   - An option field that held its own list of values gets an ENUM schema made of them (`<schema><Field>`), so its
     values keep being delivered. Rename it in Schemas if you like; the field follows.
   - Content blocks lose the legacy `schema` key: the block's schema is in `_schema` only (copied from `schema` when the
     block had no `_schema`). A site that reads `schema` must read `_schema`.
   - Firebase Hosting carries at most 32 MB of a file. A Firebase environment with the fix refuses a larger file
     (`413`, with its size): the import keeps the asset without its file and goes on, with a warning naming it. An
     older one sends the file cut, also named in a warning. Download such a file from the Firebase console's Storage;
     an asset kept without its file shows "File missing" in Assets: **Upload file** in its menu puts the file into
     that same asset, so the contents using it keep working. (A cut file: upload it as a new asset.)
7. Revoke the migration token in the Firebase environment when you are done.

Not imported: users, global settings, published snapshots (publish again), webhook logs, tasks.
