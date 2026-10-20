import { UserRole } from '@localess/shared';

/** A role as Admin → Users offers it: what to call it and what it lets the user do (docs/frontend-permissions.md). */
export interface UserRoleOption {
  id: UserRole;
  label: string;
  desc: string;
}

/** The five roles, most access first; no role (`null`) is "None": signed up or invited, no access yet. */
export const USER_ROLE_OPTIONS: readonly UserRoleOption[] = [
  { id: 'ADMIN', label: 'Admin', desc: 'Everything: users, creating and deleting spaces, every space.' },
  { id: 'DEVELOPER', label: 'Developer', desc: 'What an editor does, plus schemas, Space Settings, API tokens, webhooks and Open API.' },
  { id: 'EDITOR', label: 'Editor', desc: 'Contents, assets and translations: create, edit, delete, publish.' },
  { id: 'TRANSLATOR', label: 'Translator', desc: 'Translation values: edit and auto-translate; reads everything else.' },
  { id: 'VIEWER', label: 'Viewer', desc: 'Reads contents, assets, translations and schemas; changes nothing.' },
];

/** The label of a role, `None` without one. */
export function roleLabel(role: UserRole | null | undefined): string {
  return USER_ROLE_OPTIONS.find(it => it.id === role)?.label ?? 'None';
}

/** What a role lets the user do; without one, that there is no access yet. */
export function roleDescription(role: UserRole | null | undefined): string {
  return USER_ROLE_OPTIONS.find(it => it.id === role)?.desc ?? 'No access yet: the user can sign in and see nothing.';
}
