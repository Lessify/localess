# @localess/ui

[Spartan](https://spartan.ng) Helm components (source only, no build step), one folder per component. The web app
imports them as `@spartan-ng/helm/<component>` through the `paths` in `apps/web/tsconfig.json`, and Tailwind scans
this folder through the `@source` in `apps/web/src/styles.css`.

Add a component with the Spartan CLI from `apps/web` (its `components.json` points `componentsPath` here), then
add its `paths` entry. Material → Spartan notes: [docs/spartan-ui-migration.md](../../docs/spartan-ui-migration.md).
