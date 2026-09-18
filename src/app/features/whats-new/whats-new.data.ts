import { WhatsNewEntry } from './whats-new.model';

/**
 * Release notes shown by the What's New dialog, newest first. Ships with the build rather than
 * living in Firestore: these describe the code the user is running, so they must move with it.
 *
 * Entries within one version are ordered by how much they change day-to-day work, not by date.
 */
export const WHATS_NEW: WhatsNewEntry[] = [
  {
    version: '4.0.0',
    date: '2026-09-18',
    title: 'Automated setup and deployment',
    description:
      'Provision and run your own Localess from the command line. `npm run localess:setup` creates the Firebase infrastructure, `localess:deploy` builds and ships it, and `localess:check --fix` reports and repairs anything a project is missing. The in-app setup wizard is gone - the first admin is created by the CLI instead.',
  },
  {
    version: '4.0.0',
    date: '2026-09-18',
    title: 'Refreshed interface',
    description:
      'Navigation, dialogs and tables have been rebuilt on the new Spartan UI components. Lists share one filter toolbar with search and multi-select filters, tables keep their sorting and paging consistent everywhere, and light and dark themes are applied across the whole app.',
  },
  {
    version: '4.0.0',
    date: '2026-09-18',
    title: 'AI-assisted translations',
    description:
      'Translate a value into every locale in one step. Each locale defines whether it can be translated from or into, rich text and Markdown keep their formatting through the translation, and you choose whether existing translations are overwritten or left alone.',
  },
  {
    version: '4.0.0',
    date: '2026-09-18',
    title: 'Smaller, faster assets',
    description:
      'Image delivery was reworked: JPEGs are encoded with mozjpeg for smaller files at the same quality, transformations never upscale beyond the original, new fit modes control cropping, and animated images are handled properly. A new /original route serves the untouched file, and JSON API responses are compressed.',
  },
  {
    version: '4.0.0',
    date: '2026-09-18',
    title: 'Spaces from templates',
    description:
      'Create a space from a ready-made structure instead of an empty shell. The Marketing Site template comes with schemas for flexible page assembly, so a new space is usable immediately.',
  },
  {
    version: '4.0.0',
    date: '2026-09-18',
    title: 'Safer API tokens',
    description:
      'Tokens can be regenerated without being deleted and recreated, and the token list now shows what each token is actually allowed to do, so an over-privileged token is visible at a glance.',
  },
  {
    version: '4.0.0',
    date: '2026-09-18',
    title: 'Faster, leaner API',
    description:
      'Referenced documents are returned without storage-only fields, caching and concurrent request handling were reworked to cut duplicate reads, and heavy modules load on demand so cold starts are noticeably shorter.',
  },
];
