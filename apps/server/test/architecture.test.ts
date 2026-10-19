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
  return { path, name: relative(SRC, path), source: ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true) };
});
type File = (typeof files)[number];

const layerOf = (file: File) => LAYERS.find(layer => file.name.endsWith(`.${layer}.ts`));
const imports = (file: File) =>
  file.source.statements.filter(ts.isImportDeclaration).map(it => (it.moduleSpecifier as ts.StringLiteral).text);
const classes = (file: File) =>
  file.source.statements.filter((it): it is ts.ClassDeclaration => ts.isClassDeclaration(it) && !!it.name);
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

  it('a models file imports nothing from NestJS', () => {
    expect(
      breaks(
        file => imports(file).filter(it => it.startsWith('@nestjs/')),
        file => file.name.endsWith('.models.ts'),
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

describe('server rules: models', () => {
  it('each zod schema zX comes with its type X: exported here, or the shared one it satisfies', () => {
    expect(
      breaks(
        file => {
          const types = new Set(
            file.source.statements
              .filter((it): it is ts.TypeAliasDeclaration | ts.InterfaceDeclaration => ts.isTypeAliasDeclaration(it) || ts.isInterfaceDeclaration(it))
              .filter(it => it.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))
              .map(it => it.name.text),
          );
          return file.source.statements
            .filter(ts.isVariableStatement)
            .filter(it => it.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))
            .flatMap(it => it.declarationList.declarations)
            .flatMap(declaration => {
              const name = declaration.name.getText(file.source);
              if (/^[A-Z][A-Z0-9_]*$/.test(name)) return []; // a constant, e.g. the sort fields
              if (!/^z[A-Z]/.test(name)) return [`export ${name} is neither a zod schema zX nor a CONSTANT`];
              const type = name.slice(1);
              const satisfied = new RegExp(`satisfies z\\.ZodType<${type}>`).test(declaration.getText(file.source));
              return types.has(type) || satisfied ? [] : [`${name} has no type ${type}`];
            });
        },
        file => file.name.endsWith('.models.ts'),
      ),
    ).toEqual([]);
  });
});
