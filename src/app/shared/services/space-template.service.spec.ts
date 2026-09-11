import { TestBed } from '@angular/core/testing';
import { doc, Firestore, serverTimestamp, writeBatch } from '@angular/fire/firestore';
import { SchemaFieldKind, SchemaType } from '@shared/models/schema.model';
import { SpaceTemplate } from '@shared/models/space-template.model';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

import { SpaceTemplateService } from './space-template.service';

const template: SpaceTemplate = {
  id: 'BLOG',
  name: 'Blog',
  description: 'Posts.',
  icon: 'lucideNewspaper',
  schemas: [
    {
      id: 'blogtag',
      type: SchemaType.ENUM,
      displayName: 'Blog Tag',
      values: [{ name: 'Design', value: 'design' }],
    },
    {
      id: 'blogpost',
      type: SchemaType.ROOT,
      displayName: 'Blog Post',
      fields: [{ name: 'title', kind: SchemaFieldKind.TEXT, displayName: 'Title', required: true }],
    },
  ],
};

const emptyTemplate: SpaceTemplate = { id: 'EMPTY', name: 'Empty', description: 'Blank.', icon: 'lucideFile', schemas: [] };

describe('SpaceTemplateService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    TestBed.configureTestingModule({ providers: [{ provide: Firestore, useValue: {} }] });
    return TestBed.inject(SpaceTemplateService);
  }

  /** The batch stub the service will have used. */
  function lastBatch() {
    return vi.mocked(writeBatch).mock.results.at(-1)!.value;
  }

  it('writes every schema at its own fixed id', async () => {
    const service = setup();

    await firstValueFrom(service.apply('space-1', template));

    expect(doc).toHaveBeenCalledWith({}, 'spaces/space-1/schemas/blogtag');
    expect(doc).toHaveBeenCalledWith({}, 'spaces/space-1/schemas/blogpost');
    expect(lastBatch().set).toHaveBeenCalledTimes(2);
  });

  it('preserves the fields of a component schema', async () => {
    const service = setup();

    await firstValueFrom(service.apply('space-1', template));

    const written = lastBatch().set.mock.calls.map((call: unknown[]) => call[1]);
    const post = written.find((w: { displayName?: string }) => w.displayName === 'Blog Post');
    expect(post.fields).toEqual([{ name: 'title', kind: SchemaFieldKind.TEXT, displayName: 'Title', required: true }]);
  });

  it('preserves the values of an enum schema', async () => {
    const service = setup();

    await firstValueFrom(service.apply('space-1', template));

    const written = lastBatch().set.mock.calls.map((call: unknown[]) => call[1]);
    const tag = written.find((w: { displayName?: string }) => w.displayName === 'Blog Tag');
    expect(tag.values).toEqual([{ name: 'Design', value: 'design' }]);
  });

  it('stamps server timestamps rather than the browser clock', async () => {
    const service = setup();

    await firstValueFrom(service.apply('space-1', template));

    const written = lastBatch().set.mock.calls.map((call: unknown[]) => call[1]);
    for (const entry of written) {
      expect(entry.createdAt).toEqual(serverTimestamp());
      expect(entry.updatedAt).toEqual(serverTimestamp());
    }
  });

  it('never stores the template-local id as a field', async () => {
    // The id is the document id. Writing it as a field too would duplicate it and drift.
    const service = setup();

    await firstValueFrom(service.apply('space-1', template));

    const written = lastBatch().set.mock.calls.map((call: unknown[]) => call[1]);
    for (const entry of written) {
      expect('id' in entry).toBe(false);
    }
  });

  it('commits once, so the template lands atomically', async () => {
    const service = setup();

    await firstValueFrom(service.apply('space-1', template));

    expect(lastBatch().commit).toHaveBeenCalledTimes(1);
  });

  it('touches Firestore not at all for a template with no schemas', async () => {
    // EMPTY is the default selection. It must cost nothing.
    const service = setup();

    await firstValueFrom(service.apply('space-1', emptyTemplate));

    expect(writeBatch).not.toHaveBeenCalled();
    expect(doc).not.toHaveBeenCalled();
  });
});
