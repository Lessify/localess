import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SchemaFieldKind, SchemaType } from '@localess/shared';
import { SpaceTemplate } from './space-template.model';
import { firstValueFrom } from 'rxjs';

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
  let http: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(SpaceTemplateService);
  }

  afterEach(() => {
    http.verify();
  });

  it('apply() posts the whole template schemas in one request', async () => {
    const service = setup();
    const done = firstValueFrom(service.apply('space-1', template));
    const request = http.expectOne({ method: 'POST', url: '/api/app/spaces/space-1/schemas/template' });
    expect(request.request.body).toEqual({ schemas: template.schemas });
    request.flush({});
    await done;
  });

  it('apply() of an empty template makes no request', async () => {
    const service = setup();
    await firstValueFrom(service.apply('space-1', emptyTemplate));
    http.expectNone('/api/app/spaces/space-1/schemas/template');
  });
});
