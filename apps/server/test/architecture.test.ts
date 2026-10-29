import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// The server rules (docs/server/README.md) checked on the source: imports between layers, file and class names, method
// names, models. A failure names the file and what breaks the rule; fix the code, or change the rule in the docs and
// here together.

const SRC = join(import.meta.dirname, '../src');
const LAYERS = ['controller', 'service', 'repository', 'module'] as const;

function sources(dir = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

const files = sources().map(path => {
  const text = readFileSync(path, 'utf8');
  // Posix separators on every platform: the checks match `modules/…`.
  return { path, name: relative(SRC, path).replaceAll('\\', '/'), source: ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true) };
});
type File = (typeof files)[number];

const layerOf = (file: File) => LAYERS.find(layer => file.name.endsWith(`.${layer}.ts`));
const imports = (file: File) =>
  file.source.statements.filter(ts.isImportDeclaration).map(it => (it.moduleSpecifier as ts.StringLiteral).text);
const classes = (file: File) => file.source.statements.filter((it): it is ts.ClassDeclaration => ts.isClassDeclaration(it) && !!it.name);
/** Nest classes (`@Injectable`, `@Controller`, `@Module`): the ones a layer file is named after. */
const nestClasses = (file: File) =>
  classes(file).filter(it => ts.getDecorators(it)?.some(d => /^@(Injectable|Controller|Module)\b/.test(d.getText(file.source))));
/** Public methods of the file's classes (not the constructor, not private or protected ones, not lifecycle hooks). */
const methods = (file: File) =>
  classes(file).flatMap(it =>
    it.members
      .filter(ts.isMethodDeclaration)
      .filter(member => !member.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword))
      .map(member => member.name.getText(file.source))
      .filter(name => !/^on(Module|Application)/.test(name)),
  );
const pascal = (kebab: string) => kebab.replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase());

/** Every `[file, what]` that breaks a rule; the test expects none. */
function breaks(check: (file: File) => string[], only: (file: File) => boolean): string[] {
  return files.filter(only).flatMap(file => check(file).map(what => `${file.name}: ${what}`));
}

/** Named after what they serve, not CRUD (docs/server/naming.md "Exceptions"). */
const isV1 = (file: File) => /\.(cdn|management)\.controller\.ts$/.test(file.name);
const isFeatureCode = (file: File) => file.name.startsWith('modules/');

/** Every feature module follows every rule (return types, counts); the space templates are data, not code. */
const isModuleCode = (file: File) => isFeatureCode(file) && !file.name.includes('/templates/');

describe('server rules: imports between layers', () => {
  it('a controller imports neither zod nor a repository', () => {
    expect(
      breaks(
        file => imports(file).filter(it => it === 'zod' || it.includes('/repositories/')),
        file => layerOf(file) === 'controller',
      ),
    ).toEqual([]);
  });

  it('a repository imports no service (infra plumbing such as EventService is not one)', () => {
    expect(
      breaks(
        file => imports(file).filter(it => !it.includes('/infra/') && (it.includes('/services/') || it.endsWith('.service.js'))),
        file => layerOf(file) === 'repository',
      ),
    ).toEqual([]);
  });
});

describe('server rules: file and class names', () => {
  it('controller, service, repository and module files are singular, their class named after the file', () => {
    expect(
      breaks(
        file => {
          const layer = layerOf(file)!;
          const base = file.name.split('/').pop()!.replace(/\.ts$/, '');
          const [entity, ...qualifiers] = base.split('.').slice(0, -1).join('.').split('.');
          const problems: string[] = [];
          if (/[^s]s$/.test(entity)) problems.push(`"${entity}" is plural`);
          const stem = pascal(entity) + qualifiers.map(pascal).join('');
          // A worker or dispatcher may be named for what it is (`TaskRunner`, `WebhookDispatcher`); acronyms keep their
          // case (`OAuthService` for oauth.service.ts).
          const allowed = [stem + pascal(layer), stem].map(it => it.toLowerCase());
          for (const it of nestClasses(file)) {
            if (!allowed.includes(it.name!.text.toLowerCase())) problems.push(`class ${it.name!.text} should be ${stem + pascal(layer)}`);
          }
          return problems;
        },
        file => !!layerOf(file),
      ),
    ).toEqual([]);
  });
});

describe('server rules: injected dependencies', () => {
  it('an injected service or repository is named after its class (SpaceRepository → spaceRepository)', () => {
    expect(
      breaks(
        file =>
          nestClasses(file).flatMap(it =>
            it.members.filter(ts.isConstructorDeclaration).flatMap(constructor =>
              constructor.parameters.flatMap(parameter => {
                const type = parameter.type?.getText(file.source) ?? '';
                if (!/(Service|Repository|Runner|Dispatcher|Worker)$/.test(type) || ts.getDecorators(parameter)?.length) return [];
                const expected = type.startsWith('OAuth') ? `oauth${type.slice(5)}` : type[0].toLowerCase() + type.slice(1);
                const name = parameter.name.getText(file.source);
                return name === expected ? [] : [`${it.name!.text}: ${name}: ${type} should be ${expected}`];
              }),
            ),
          ),
        () => true,
      ),
    ).toEqual([]);
  });
});

describe('server rules: return types', () => {
  it('every public method and exported function of a module declares its return type', () => {
    expect(
      breaks(
        file => {
          const missing: string[] = [];
          for (const it of classes(file)) {
            for (const member of it.members) {
              if (!ts.isMethodDeclaration(member) || member.type) continue;
              if (member.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword))
                continue;
              missing.push(`${it.name!.text}.${member.name.getText(file.source)}`);
            }
          }
          for (const statement of file.source.statements) {
            if (!ts.canHaveModifiers(statement) || !ts.getModifiers(statement)?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
            if (ts.isFunctionDeclaration(statement) && !statement.type) missing.push(statement.name?.text ?? 'default');
            if (ts.isVariableStatement(statement)) {
              for (const declaration of statement.declarationList.declarations) {
                const init = declaration.initializer;
                if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && !init.type && !declaration.type) {
                  missing.push(declaration.name.getText(file.source));
                }
              }
            }
          }
          return missing.map(name => `${name} has no declared return type`);
        },
        file => isModuleCode(file),
      ),
    ).toEqual([]);
  });
});

describe('server rules: access', () => {
  it('every route declares who may call it: @Public, a token (@CdnToken, @ManagementToken), @RequireRole or @SignedIn', () => {
    const ACCESS = /^@(Public|CdnToken|ManagementToken|RequireRole|SignedIn)\b/;
    const VERB = /^@(Get|Post|Put|Patch|Delete|All)\b/;
    const declares = (node: ts.HasDecorators, file: File) => (ts.getDecorators(node) ?? []).some(d => ACCESS.test(d.getText(file.source)));
    expect(
      breaks(
        file =>
          classes(file)
            .filter(it => (ts.getDecorators(it) ?? []).some(d => /^@Controller\b/.test(d.getText(file.source))))
            .flatMap(controller =>
              controller.members
                .filter(ts.isMethodDeclaration)
                .filter(method => (ts.getDecorators(method) ?? []).some(d => VERB.test(d.getText(file.source))))
                .filter(method => !declares(method, file) && !declares(controller, file))
                .map(method => `${controller.name!.text}.${method.name.getText(file.source)} declares no access`),
            ),
        file => layerOf(file) === 'controller',
      ),
    ).toEqual([]);
  });
});

describe('server rules: queries', () => {
  it('a count or an existence check in a module is `$count`, not a select of `count()`', () => {
    expect(
      breaks(
        file =>
          file.source.statements
            .filter(ts.isImportDeclaration)
            .filter(it => (it.moduleSpecifier as ts.StringLiteral).text === 'drizzle-orm')
            .flatMap(it => {
              const bindings = it.importClause?.namedBindings;
              return bindings && ts.isNamedImports(bindings) ? bindings.elements.map(element => element.name.text) : [];
            })
            .filter(name => name === 'count')
            .map(() => 'imports count() from drizzle-orm: use this.db.$count(table, where)'),
        file => isModuleCode(file),
      ),
    ).toEqual([]);
  });
});

describe('server rules: method names', () => {
  it('controllers and services use the NestJS names: findAll, findOne, find<What>, create, update, remove', () => {
    expect(
      breaks(
        file => methods(file).filter(name => /^(list|get|page|delete)([A-Z]|$)/.test(name)),
        file => isFeatureCode(file) && (layerOf(file) === 'service' || (layerOf(file) === 'controller' && !isV1(file))),
      ),
    ).toEqual([]);
  });

  it('repositories use data-access names: find, count, exists, create, insert, update, delete', () => {
    expect(
      breaks(
        file => methods(file).filter(name => /^(get|list|remove)([A-Z]|$)/.test(name)),
        file => layerOf(file) === 'repository',
      ),
    ).toEqual([]);
  });
});

describe('server rules: entities (the database rows)', () => {
  it('a table type is declared only in shared/entities: no $inferSelect / $inferInsert elsewhere', () => {
    expect(
      breaks(
        file =>
          /\$infer(Select|Insert)/.test(file.source.text)
            ? ['uses $infer: import <Entity>Entity / <Entity>InsertEntity from shared/entities']
            : [],
        file => !file.name.startsWith('shared/entities/') && file.name !== 'infra/database/schema.ts',
      ),
    ).toEqual([]);
  });

  it('an entity file is <entity>.entity.ts with <Entity>Entity, <Entity>InsertEntity and <Entity>Select', () => {
    expect(
      breaks(
        file => {
          const base = file.name.split('/').pop()!;
          if (!base.endsWith('.entity.ts')) return ['is not named <entity>.entity.ts'];
          const stem = pascal(base.replace(/\.entity\.ts$/, ''));
          const types = file.source.statements.filter(ts.isTypeAliasDeclaration).map(it => it.name.text);
          return [`${stem}Entity`, `${stem}InsertEntity`, `${stem}Select`].filter(it => !types.includes(it)).map(it => `has no ${it}`);
        },
        file => file.name.startsWith('shared/entities/'),
      ),
    ).toEqual([]);
  });
});

describe('server rules: request models (one definition in @localess/shared)', () => {
  const SHARED = join(import.meta.dirname, '../../../packages/shared/src');
  /**
   * The App API's request schemas: every `zX` a controller validates with (`{ schema: zX }`, `zX.safeParse`). The v1
   * Management API's (`zSchemaPushSchema`, …) are not in this rule yet.
   */
  const used = new Map<string, string>();
  for (const file of files.filter(it => layerOf(it) === 'controller' && !isV1(it))) {
    for (const match of file.source.text.matchAll(/(?:schema:\s*|\b)(z[A-Z]\w*)(?=\s*\}|\.safeParse)/g)) used.set(match[1], file.name);
  }
  /** Every exported `zX` of the shared zod files, with the text of its file. */
  const shared = new Map<string, string>();
  for (const name of readdirSync(join(SHARED, 'models')).filter(it => it.endsWith('.zod.ts'))) {
    const text = readFileSync(join(SHARED, 'models', name), 'utf8');
    for (const match of text.matchAll(/export const (z[A-Z]\w*)/g)) shared.set(match[1], text);
  }

  it('a controller validates with a schema from @localess/shared/zod, never one of its own', () => {
    expect(
      breaks(
        file => {
          const local = file.source.statements
            .filter(ts.isVariableStatement)
            .flatMap(it => it.declarationList.declarations.map(d => d.name.getText(file.source)))
            .filter(name => /^z[A-Z]/.test(name));
          return local.map(name => `declares ${name}: move it to packages/shared/src/models/<entity>.zod.ts`);
        },
        file => file.name.startsWith('modules/') || file.name.startsWith('auth/'),
      ),
    ).toEqual([]);
    expect(
      [...used].filter(([name]) => !shared.has(name)).map(([name, file]) => `${file}: ${name} is not in @localess/shared/zod`),
    ).toEqual([]);
  });

  it('each request schema zX has its type X next to it (z.infer, or the hand-written type it satisfies)', () => {
    const missing = [...used.keys()].filter(name => {
      const type = name.slice(1);
      const text = shared.get(name) ?? '';
      return !new RegExp(`export type ${type}\\b`).test(text) && !new RegExp(`satisfies z\\.ZodType<${type}>`).test(text);
    });
    expect(missing).toEqual([]);
  });
});
