import { expect, test, uniqueId } from '../support/fixtures';

test.describe('CDN API → contents', () => {
  test('serves a published document by id and by full slug @smoke', async ({ api, space, request }) => {
    const schema = await api.createSchema(space.id, {
      name: uniqueId('page'),
      type: 'ROOT',
      fields: [{ name: 'title', kind: 'TEXT', translatable: true }],
    });
    const folder = await api.createFolder(space.id, { name: 'Blog', slug: 'blog' });
    const doc = await api.createDocument(space.id, { name: 'Hello', slug: 'hello', schema: schema.name, parentId: folder.id });
    await api.saveDocumentData(space.id, doc, { title: 'Hello World' });
    const { token } = await api.createToken(space.id, { name: 'Public', type: 'public' });

    // Not published yet.
    expect((await request.get(`/api/v1/spaces/${space.id}/contents/${doc.id}?token=${token}`)).status()).toBe(404);

    await api.publishContent(space.id, doc.id);
    const byId = await request.get(`/api/v1/spaces/${space.id}/contents/${doc.id}?token=${token}`);
    expect(byId.status()).toBe(200);
    const body = await byId.json();
    expect(body).toMatchObject({ id: doc.id, slug: 'hello', fullSlug: 'blog/hello', kind: 'DOCUMENT' });
    expect(body.data).toMatchObject({ title: 'Hello World', _schema: schema.name });

    const bySlug = await request.get(`/api/v1/spaces/${space.id}/contents/slugs/blog/hello?token=${token}`);
    expect(bySlug.status()).toBe(200);
    expect((await bySlug.json()).id).toBe(doc.id);

    expect((await request.get(`/api/v1/spaces/${space.id}/contents/slugs/blog/nope?token=${token}`)).status()).toBe(404);
  });

  test('the draft of a document is only for preview tokens', async ({ api, space, request }) => {
    const schema = await api.createSchema(space.id, {
      name: uniqueId('page'),
      type: 'ROOT',
      fields: [{ name: 'title', kind: 'TEXT' }],
    });
    const doc = await api.createDocument(space.id, { name: 'Draft', slug: 'draft', schema: schema.name });
    await api.saveDocumentData(space.id, doc, { title: 'v1' });
    await api.publishContent(space.id, doc.id);
    await api.saveDocumentData(space.id, doc, { title: 'v2 (draft)' });
    const pub = (await api.createToken(space.id, { name: 'Public', type: 'public' })).token;
    const prv = (await api.createToken(space.id, { name: 'Preview', type: 'preview' })).token;
    const url = `/api/v1/spaces/${space.id}/contents/${doc.id}`;

    expect((await (await request.get(`${url}?token=${pub}`)).json()).data.title).toBe('v1');
    expect((await request.get(`${url}?token=${pub}&version=draft`)).status()).toBe(403);
    expect((await (await request.get(`${url}?token=${prv}&version=draft`)).json()).data.title).toBe('v2 (draft)');
  });
});
