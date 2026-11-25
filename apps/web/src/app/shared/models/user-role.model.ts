import { UserRole } from '@localess/shared';

/** A role as Admin → Users offers it: what to call it, its icon, and what it lets the user do (docs/frontend-permissions.md). */
export interface UserRoleOption {
  id: UserRole;
  label: string;
  icon: string;
  desc: string;
}

/** The five roles, most access first; no role (`null`) is "None": signed up or invited, no access yet. */
export const USER_ROLE_OPTIONS: readonly UserRoleOption[] = [
  {
    id: 'ADMIN',
    label: 'Admin',
    icon: 'lucideShieldCheck',
    desc: 'Runs the installation: invites and manages users, creates and deletes spaces (Admin → Spaces, the Firebase import), regenerates asset metadata, and does everything a developer does in every space.',
  },
  {
    id: 'DEVELOPER',
    label: 'Developer',
    icon: 'lucideCodeXml',
    desc: 'Builds the site that reads Localess: everything an editor does, plus schemas (edit, import, export), Space Settings (general, locales, environments, API tokens), webhooks, Open API, and deleting all translations.',
  },
  {
    id: 'EDITOR',
    label: 'Editor',
    icon: 'lucidePenLine',
    desc: 'Writes and publishes: contents, assets and translations (create, edit, delete, publish), translation keys (add, rename, labels), import and export tasks, Unsplash.',
  },
  {
    id: 'TRANSLATOR',
    label: 'Translator',
    icon: 'lucideLanguages',
    desc: 'Translates: edits translation values, Translate Locale, machine translation; reads contents, assets and schemas. Can not add, rename or delete keys, nor publish.',
  },
  {
    id: 'VIEWER',
    label: 'Viewer',
    icon: 'lucideEye',
    desc: 'Reviews and follows along: reads contents, assets, translations and schemas; changes nothing.',
  },
];

/** "None" as the role cards show it: no role yet. */
export const NO_ROLE_OPTION = {
  label: 'None',
  icon: 'lucideUserX',
  desc: 'No access yet: can sign in, and is asked to contact an administrator.',
} as const;

/** The label of a role, `None` without one. */
export function roleLabel(role: UserRole | null | undefined): string {
  return USER_ROLE_OPTIONS.find(it => it.id === role)?.label ?? NO_ROLE_OPTION.label;
}

/** What a role lets the user do; without one, that there is no access yet. */
export function roleDescription(role: UserRole | null | undefined): string {
  return USER_ROLE_OPTIONS.find(it => it.id === role)?.desc ?? NO_ROLE_OPTION.desc;
}
