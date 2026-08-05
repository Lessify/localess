import { TestBed } from '@angular/core/testing';
import { OpenApiService } from '@shared/services/open-api.service';
import { SpaceStore } from '@shared/stores/space.store';
import { signal } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';

import { OpenApiComponent } from './open-api.component';

describe('OpenApiComponent', () => {
  function setup(selectedSpaceId: string | undefined) {
    const generate = vi.fn().mockReturnValue(of('openapi: 3.0.0'));
    TestBed.overrideComponent(OpenApiComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      providers: [
        { provide: OpenApiService, useValue: { generate } },
        { provide: SpaceStore, useValue: { selectedSpaceId: signal(selectedSpaceId) } },
      ],
    });
    const fixture = TestBed.createComponent(OpenApiComponent);
    fixture.detectChanges();
    return { component: fixture.componentInstance, generate };
  }

  it('generates the OpenAPI document for the selected space', async () => {
    const { component, generate } = setup('space-1');

    expect(generate).toHaveBeenCalledWith('space-1');
    await expect(firstValueFrom(component.openApiDocument$!)).resolves.toBe('openapi: 3.0.0');
  });

  it('does nothing when no space is selected', () => {
    const { component, generate } = setup(undefined);

    expect(generate).not.toHaveBeenCalled();
    expect(component.openApiDocument$).toBeUndefined();
  });
});
