import { WhatsNewRelease } from './whats-new.model';

/**
 * Release notes shown by the What's New dialog, newest first. Ships with the build rather than
 * living in Firestore: these describe the code the user is running, so they must move with it.
 *
 * Items summarise a release rather than reproducing its change log - the full notes live at
 * https://github.com/Lessify/localess/releases.
 */
export const WHATS_NEW: WhatsNewRelease[] = [
  {
    version: '4.1.0',
    date: '2026-10-05',
    description:
      'A Visual Editor release: blocks can be rearranged straight from the page preview, preview URLs take placeholders, and the preview explains itself when something is off.',
    items: [
      {
        label: 'new',
        title: 'Edit blocks from the page preview',
        description:
          'Selecting a block in the preview shows a toolbar on it to move it up or down, duplicate it or delete it, without going back to the form. Changes stay unsaved edits until you save, just like edits made in the form.',
      },
      {
        label: 'new',
        title: 'Flexible preview URLs',
        description:
          'Environment URLs accept `{fullSlug}`, `{slug}`, `{parentSlug}`, `{documentId}`, `{locale}` and `{locale/}` placeholders, even in the host, and each URL field shows an example of the page it will open. URLs without placeholders work as before.',
      },
      {
        label: 'improved',
        title: 'Clearer preview connection',
        description:
          'If the page does not connect, a hint lists what to check. The status tooltip shows the connected SDK, a notice appears when the page shows a different document than the one being edited, and reloads inside the preview reconnect on their own.',
      },
      {
        label: 'new',
        title: 'Raw translation export',
        description:
          'A new endpoint returns only the values stored for a locale, without fallback filling, so a file can be pulled, edited and pushed back without saving the fallback language as translations. The CLI uses it for `localess translation pull --raw`.',
      },
      {
        label: 'improved',
        title: 'Shareable space links',
        description:
          'The URL now decides which space is open, so a shared link opens the right space. Links to unknown spaces redirect with a warning, and live data reconnects on its own after an error.',
      },
      {
        label: 'improved',
        title: 'Correct translatable fields',
        description:
          'Reference, References, Schema and Schemas fields can no longer be marked translatable - their value is shared by every locale. Fields that are not translatable are read-only outside the default locale.',
      },
      {
        label: 'improved',
        title: 'Safer translation and schema push',
        description:
          'Translation push splits `delete-missing` into `delete-missing-key` (removes the key in every locale) and `delete-missing-value` (removes only the pushed locale) and returns only the IDs it wrote. Schema push rejects Schema fields with no allowed schemas. Upgrade `@localess/cli` with this release.',
      },
    ],
  },
  {
    version: '4.0.0',
    date: '2026-09-18',
    description:
      'A self-hosting release: Localess now provisions and deploys itself from the command line, and the interface it ships has been rebuilt from the ground up.',
    items: [
      {
        label: 'new',
        title: 'Automated setup and deployment',
        description:
          'Provision and run your own Localess from the command line. `npm run localess:setup` creates the Firebase infrastructure, `localess:deploy` builds and ships it, and `localess:check --fix` reports and repairs anything a project is missing. The in-app setup wizard is gone - the first admin is created by the CLI instead.',
      },
      {
        label: 'improved',
        title: 'Refreshed interface',
        description:
          'Navigation, dialogs and tables have been rebuilt on the new Spartan UI components. Lists share one filter toolbar with search and multi-select filters, tables keep their sorting and paging consistent everywhere, and light and dark themes are applied across the whole app.',
      },
      {
        label: 'new',
        title: 'AI-assisted translations',
        description:
          'Translate a value into every locale in one step. Each locale defines whether it can be translated from or into, rich text and Markdown keep their formatting through the translation, and you choose whether existing translations are overwritten or left alone.',
      },
      {
        label: 'improved',
        title: 'Smaller, faster assets',
        description:
          'Image delivery was reworked: JPEGs are encoded with mozjpeg for smaller files at the same quality, transformations never upscale beyond the original, new fit modes control cropping, and animated images are handled properly. A new /original route serves the untouched file, and JSON API responses are compressed.',
      },
      {
        label: 'new',
        title: 'Spaces from templates',
        description:
          'Create a space from a ready-made structure instead of an empty shell. The Marketing Site template comes with schemas for flexible page assembly, so a new space is usable immediately.',
      },
      {
        label: 'improved',
        title: 'Safer API tokens',
        description:
          'Tokens can be regenerated without being deleted and recreated, and the token list now shows what each token is actually allowed to do, so an over-privileged token is visible at a glance.',
      },
      {
        label: 'improved',
        title: 'Faster, leaner API',
        description:
          'Referenced documents are returned without storage-only fields, caching and concurrent request handling were reworked to cut duplicate reads, and heavy modules load on demand so cold starts are noticeably shorter.',
      },
    ],
  },
  {
    version: '3.2.0',
    date: '2026-06-11',
    description: 'Finer control over how long API responses stay cached, plus accessibility and multi-locale publishing improvements.',
    items: [
      {
        label: 'new',
        title: 'Token cache TTL',
        description:
          'API tokens take a configurable time-to-live, so you decide how long responses served with that token stay cached rather than living with one fixed expiry.',
      },
      {
        label: 'new',
        title: 'Alt text for images',
        description: 'Image assets accept alt text in the edit file dialog, so what you publish carries its own accessible description.',
      },
      {
        label: 'improved',
        title: 'Locale-specific publishing',
        description:
          'Document publishing now stores content per locale with reworked path handling, making delivery to a multi-locale site more reliable.',
      },
      {
        label: 'improved',
        title: 'Visual editor connection status',
        description:
          'The editor shows where the preview actually is: loading, loaded, connected to the Localess SDK, or failed - each state with a tooltip explaining it, so a blank frame is no longer a guess.',
      },
      {
        label: 'improved',
        title: 'Asset and content metadata',
        description:
          'Both models were reworked so metadata is handled consistently across assets and content instead of diverging per feature.',
      },
    ],
  },
  {
    version: '3.1.0',
    date: '2026-05-28',
    description:
      'A round of improvements before the summer: translations that draft themselves, imports that skip what has not changed, and a broad pass over dialogs and forms.',
    items: [
      {
        label: 'new',
        title: 'Automatic translation drafts',
        description:
          'Drafts are generated after a write, so there is no separate step to remember. Draft files are only written when translations are actually imported.',
      },
      {
        label: 'improved',
        title: 'Faster imports',
        description:
          'Assets, content, schemas and translations are checked for changes before anything is written, so an import that mostly repeats itself skips the unchanged files.',
      },
      {
        label: 'new',
        title: 'Image transforms in the CDN',
        description:
          'Asset URLs accept height, quality and format parameters, so a single asset can be served sized and encoded for where it is used.',
      },
      {
        label: 'improved',
        title: 'Visual editor',
        description:
          'The editor tracks unsaved changes and warns before you navigate away, content status transitions read more clearly, and saving from the editor was reworked.',
      },
      {
        label: 'new',
        title: 'Schemas endpoint',
        description:
          'A new endpoint returns every schema in a space, so a client can discover the content model without being told it in advance.',
      },
      {
        label: 'improved',
        title: 'Dialogs rebuilt',
        description:
          'Users, invites, spaces, asset and reference selection, export and import all moved to the Spartan components. Expansion panels became accordions, and selects gained a placeholder and a clearable option.',
      },
      {
        label: 'improved',
        title: 'Unified webhook events',
        description:
          'Separate content and translation update events were merged into one `changed` event. Consumers subscribed to the old `content.updated` and `translation.updated` events need updating.',
      },
      {
        label: 'fixed',
        title: 'Asset preview and form validation',
        description: 'Clicking an asset opens its preview again, and a validation problem that affected several dialogs was fixed.',
      },
    ],
  },
  {
    version: '3.0.1',
    date: '2026-03-12',
    description: 'A follow-up to v3.0.0 that extends the new webhook system to translations.',
    items: [
      {
        label: 'new',
        title: 'Translation webhooks',
        description:
          'Webhooks now fire for translations as well as content, with four events: translation published, added, edited and deleted.',
      },
    ],
  },
  {
    version: '3.0.0',
    date: '2026-03-09',
    description:
      'A major release: webhooks, granular API tokens, translation drafts and a redesigned interface. Upgrading from 2.x is worth reading the breaking changes for.',
    items: [
      {
        label: 'new',
        title: 'Webhooks',
        description:
          'Create webhooks in Space Settings and be notified when content is published, unpublished, updated or deleted. Each webhook takes custom headers and an optional secret for signature verification, and every delivery is logged with its status code, response time and error.',
      },
      {
        label: 'new',
        title: 'Granular API token permissions',
        description:
          'Tokens carry an explicit list of what they may do - published or draft translations, published or draft content, developer tooling - instead of granting everything. Existing tokens keep working: they are treated as holding the four content and translation permissions.',
      },
      {
        label: 'new',
        title: 'Translation drafts',
        description:
          'Translations have a draft version stored separately from the published one, so editing never overwrites what is live. The API serves drafts through a version parameter, which requires a token holding the draft permission.',
      },
      {
        label: 'new',
        title: 'AI-powered locale translation',
        description:
          'Translate a whole locale into another in one background job, Markdown fields included. A dialog walks you through choosing the source and target locale.',
      },
      {
        label: 'new',
        title: 'Translation filters',
        description:
          'Filter the translation list by status - translated, partially translated or untranslated - and by per-locale completion, with one click to clear every filter.',
      },
      {
        label: 'new',
        title: 'Unpublish content',
        description:
          'Content documents can be taken back to draft from the action menu, which fires the unpublished webhook. The same menu copies a document slug or its full hierarchical slug.',
      },
      {
        label: 'improved',
        title: 'Redesigned interface',
        description:
          'The UI was rebuilt on the Spartan/Helm component library with Tailwind CSS, bringing a new sidebar, breadcrumbs and toast notifications. Angular was upgraded to v21 along the way.',
      },
      {
        label: 'improved',
        title: 'Know when a new version ships',
        description: 'The app notices when a new deployment has been released and offers to reload, so you are not left on a stale build.',
      },
    ],
  },
];
