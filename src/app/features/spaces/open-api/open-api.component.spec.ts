import { TestBed } from '@angular/core/testing';
import { OpenApiService } from '@shared/services/open-api.service';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';

import { OpenApiComponent } from './open-api.component';

describe('OpenApiComponent', () => {
  function setup() {
    const generate = vi.fn().mockReturnValue(of('openapi: 3.0.0'));
    TestBed.overrideComponent(OpenApiComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({ providers: [{ provide: OpenApiService, useValue: { generate } }] });
    const fixture = TestBed.createComponent(OpenApiComponent);
    fixture.componentRef.setInput('spaceId', 'space-1');
    fixture.detectChanges();
    return { component: fixture.componentInstance, generate };
  }

  it('generates the OpenAPI document for the given space on init', async () => {
    const { component, generate } = setup();

    expect(generate).toHaveBeenCalledWith('space-1');
    await expect(firstValueFrom(component.openApiDocument$!)).resolves.toBe('openapi: 3.0.0');
  });
});
