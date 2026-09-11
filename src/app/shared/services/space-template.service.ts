import { inject, Injectable } from '@angular/core';
import { doc, Firestore, serverTimestamp, writeBatch } from '@angular/fire/firestore';
import { traceUntilFirst } from '@angular/fire/performance';
import { SpaceTemplate } from '@shared/models/space-template.model';
import { from, Observable, of } from 'rxjs';

/**
 * Applies a space template's schemas.
 *
 * Deliberately not built on `SchemaService.create`, which writes only `displayName` and `type` and
 * drops `fields` and `values` entirely - the schema UI adds fields in a separate edit step. A
 * template has to land complete, so it writes whole documents itself.
 *
 * One batch, so a template is all-or-nothing: a space with half a template in it would be worse
 * than a space with none.
 */
@Injectable({ providedIn: 'root' })
export class SpaceTemplateService {
  private readonly firestore = inject(Firestore);

  apply(spaceId: string, template: SpaceTemplate): Observable<void> {
    // EMPTY is the default selection, so the common path must cost nothing at all.
    if (template.schemas.length === 0) return of(undefined);

    const batch = writeBatch(this.firestore);

    for (const schema of template.schemas) {
      // `id` is the document id, so it is destructured out rather than stored as a field too.
      const { id, ...fields } = schema;
      batch.set(doc(this.firestore, `spaces/${spaceId}/schemas/${id}`), {
        ...fields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return from(batch.commit()).pipe(traceUntilFirst('Firestore:SpaceTemplates:apply'));
  }
}
