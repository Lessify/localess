import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** What a route needs, as the server's access decorators say (`apps/server/src/auth/decorators.ts`). */
export type RouteAccess =
  | { kind: 'admin' }
  | { kind: 'anyRole' }
  | { kind: 'anyOf'; permissions: string[] }
  | { kind: 'allOf'; permissions: string[] };

export interface AppRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** `/api/app/...` with the controller's `:params`. */
  path: string;
  access: RouteAccess;
  /** `controller file › handler`, for messages. */
  source: string;
}

const SERVER_SRC = resolve(import.meta.dirname, '../../../server/src');

function controllerFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return controllerFiles(path);
    return entry.name.endsWith('.controller.ts') ? [path] : [];
  });
}

/** `UserPermission.X` and `...CONST` (an array of them declared in the file) to permission names. */
function permissionsOf(args: string, file: string): string[] {
  return args
    .split(',')
    .map(it => it.trim())
    .filter(Boolean)
    .flatMap(arg => {
      const spread = arg.match(/^\.\.\.(\w+)$/);
      if (spread) {
        const list = file.match(new RegExp(`const ${spread[1]}\\s*=\\s*\\[([^\\]]*)\\]`));
        if (!list) throw new Error(`can not resolve ...${spread[1]}`);
        return permissionsOf(list[1], file);
      }
      const name = arg.match(/^UserPermission\.(\w+)$/);
      if (!name) throw new Error(`unknown permission argument ${arg}`);
      return [name[1]];
    });
}

function accessOf(decorator: string, args: string, file: string): RouteAccess {
  switch (decorator) {
    case 'RequireAdmin':
      return { kind: 'admin' };
    case 'RequireAnyRole':
      return { kind: 'anyRole' };
    case 'RequirePermission':
      return { kind: 'anyOf', permissions: permissionsOf(args, file) };
    default:
      return { kind: 'allOf', permissions: permissionsOf(args, file) };
  }
}

const ACCESS = /@(RequireAdmin|RequireAnyRole|RequirePermission|RequireAllPermissions)\(([^)]*)\)/;

/**
 * Every App API route (`/api/app/**`) that declares its access, read from the server's controllers: a method's own
 * decorator, else its class's. Routes with none (signed in is enough: `me`, `events`, `locales`) are left out.
 */
export function appRoutes(): AppRoute[] {
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
        access: accessOf(found[1], found[2], file),
        source: `${path.slice(SERVER_SRC.length + 1)} › ${name}`,
      });
    }
  }
  return routes;
}
