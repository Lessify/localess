import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** The roles a route lets in, as its `@RequireRole` says (`apps/server/src/auth/decorators.ts`). */
export interface RouteAccess {
  roles: string[];
}

export interface AppRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** `/api/app/...` with the controller's `:params`. */
  path: string;
  access: RouteAccess;
  /** `controller file › handler`, for messages. */
  source: string;
}

const SERVER_SRC = resolve(import.meta.dirname, '../../../server/src');
const ROLES_FILE = resolve(import.meta.dirname, '../../../../packages/shared/src/roles.ts');

function controllerFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return controllerFiles(path);
    return entry.name.endsWith('.controller.ts') ? [path] : [];
  });
}

/** The role lists of `@localess/shared` (`roles.ts`), by name: `CONTENT_WRITERS` → `['ADMIN', 'DEVELOPER', 'EDITOR']`. */
export function roleLists(): Record<string, string[]> {
  const lists: Record<string, string[]> = {};
  const source = readFileSync(ROLES_FILE, 'utf8');
  for (const match of source.matchAll(/export const (\w+) = \[([^\]]*)\] as const/g)) {
    lists[match[1]] = [...match[2].matchAll(/'(\w+)'/g)].map(it => it[1]);
  }
  return lists;
}

/** `@RequireRole(…)`'s argument to roles: a list's name, one role (`'ADMIN'`) or an inline list. */
function rolesOf(arg: string, lists: Record<string, string[]>): string[] {
  const value = arg.trim();
  if (/^'\w+'$/.test(value)) return [value.slice(1, -1)];
  if (value.startsWith('[')) return [...value.matchAll(/'(\w+)'/g)].map(it => it[1]);
  const list = lists[value];
  if (!list) throw new Error(`unknown role list ${value}`);
  return list;
}

const ACCESS = /@RequireRole\(([^)]*)\)/;

/**
 * Every App API route (`/api/app/**`) that declares its access, read from the server's controllers: a method's own
 * decorator, else its class's. Routes with none (signed in is enough: `me`, `events`, `locales`) are left out.
 */
export function appRoutes(): AppRoute[] {
  const lists = roleLists();
  const routes: AppRoute[] = [];
  for (const path of controllerFiles(join(SERVER_SRC, 'modules'))) {
    const file = readFileSync(path, 'utf8');
    const controller = file.match(/@Controller\('([^']+)'\)/);
    if (!controller || !controller[1].startsWith('api/app/')) continue;
    const classStart = file.indexOf('export class');
    const header = file.slice(0, classStart).match(new RegExp(ACCESS.source, 'g')) ?? [];
    const classAccess = header.length > 0 ? header.at(-1)!.match(ACCESS)! : undefined;
    const body = file.slice(classStart);
    // A route: its HTTP decorator, then the decorators up to the handler's name.
    const handler = /@(Get|Post|Put|Patch|Delete)\((?:'([^']*)')?\)([\s\S]*?)\n\s+(?:async\s+)?(\w+)\(/g;
    for (let match = handler.exec(body); match; match = handler.exec(body)) {
      const [, verb, sub, decorators, name] = match;
      const own = decorators.match(ACCESS);
      const found = own ?? classAccess;
      if (!found) continue;
      routes.push({
        method: verb.toUpperCase() as AppRoute['method'],
        path: `/${controller[1]}${sub ? `/${sub}` : ''}`,
        access: { roles: rolesOf(found[1], lists) },
        source: `${path.slice(SERVER_SRC.length + 1)} › ${name}`,
      });
    }
  }
  return routes;
}
