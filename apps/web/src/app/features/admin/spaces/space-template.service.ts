import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { SpaceTemplate } from './space-template.model';

/**
 * Applies a space template's schemas.
 *
 * Deliberately not built on `SchemaService.create`, which sends only `displayName` and `type` - the
 * schema UI adds fields in a separate edit step. A template has to land complete, so the server writes
 * whole schemas in one transaction: a space with half a template in it would be worse than none.
 */
@Injectable({ providedIn: 'root' })
export class SpaceTemplateService {
  private readonly http = inject(HttpClient);

  apply(spaceId: string, template: SpaceTemplate): Observable<void> {
    // EMPTY is the default selection, so the common path must cost nothing at all.
    if (template.schemas.length === 0) return of(undefined);
    return this.http.post<void>(`/api/app/spaces/${spaceId}/schemas/template`, { schemas: template.schemas });
  }
}
