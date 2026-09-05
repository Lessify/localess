import { describe, expect, it } from 'vitest';
import { generateOpenApi } from './open-api.service';
import { Schema, SchemaType } from '../models';

/** Minimal ROOT schema so the generator has something to derive ContentData from. */
const schemas = new Map<string, Schema>([['page', { id: 'page', name: 'Page', type: SchemaType.ROOT, fields: [] } as unknown as Schema]]);

/**
 * Declared property names of a component, flattening `allOf`.
 * Deliberately structural: serializing and string-matching would also hit the `example` block,
 * which is how an earlier version of this test passed while the property was missing.
 */
function declaredProperties(schema: unknown): string[] {
  if (!schema || typeof schema !== 'object') return [];
  const node = schema as { properties?: Record<string, unknown>; allOf?: unknown[] };
  const own = node.properties ? Object.keys(node.properties) : [];
  const inherited = (node.allOf ?? []).flatMap(member => declaredProperties(member));
  return [...own, ...inherited];
}

/** Collect every `$ref` string in the document, at any depth. */
function collectRefs(node: unknown, found: string[] = []): string[] {
  if (Array.isArray(node)) {
    node.forEach(item => collectRefs(item, found));
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === '$ref' && typeof value === 'string') found.push(value);
      else collectRefs(value, found);
    }
  }
  return found;
}

describe('generateOpenApi', () => {
  const doc = generateOpenApi(schemas);
  const components = doc.components?.schemas ?? {};

  it('every $ref resolves to a declared component', () => {
    const dangling = collectRefs(doc)
      .filter(ref => ref.startsWith('#/components/schemas/'))
      .map(ref => ref.replace('#/components/schemas/', ''))
      .filter(name => !(name in components));
    expect(dangling).toEqual([]);
  });

  it('References reuses Content as its value type', () => {
    // Deliberately not a dedicated schema: `References` is a shared shape, so what a value
    // actually carries is described per endpoint instead — see its own description below.
    const references = components['References'] as { additionalProperties?: { $ref?: string } };
    expect(references.additionalProperties?.$ref).toBe('#/components/schemas/Content');
  });

  it('the References description records the endpoint behaviour', () => {
    // The stripping and the one-level rule are endpoint behaviour, so they must be documented
    // somewhere a consumer reading the spec will see them.
    const description = (components['References'] as { description?: string }).description ?? '';
    expect(description).toMatch(/one level deep/i);
    expect(description).toMatch(/stripped/i);
    expect(description).toMatch(/uri/i);
  });

  it('Content declares locale — the API always returns it', () => {
    expect(declaredProperties(components['Content'])).toContain('locale');
  });

  it('Links still points at ContentMetadata', () => {
    const links = components['Links'] as { additionalProperties?: { $ref?: string } };
    expect(links.additionalProperties?.$ref).toBe('#/components/schemas/ContentMetadata');
  });

  it('ContentMetadata does not declare locale — it types Links, which carries none', () => {
    expect(declaredProperties(components['ContentMetadata'])).not.toContain('locale');
    expect((components['ContentMetadata'] as { required?: string[] }).required ?? []).not.toContain('locale');
  });

  it('is a well-formed OpenAPI 3.0 document', () => {
    expect(doc.openapi).toMatch(/^3\.0/);
    expect(doc.info?.title).toBeTruthy();
    expect(doc.info?.version).toBeTruthy();
    expect(Object.keys(doc.paths ?? {}).length).toBeGreaterThan(0);
  });
});
