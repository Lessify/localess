import { inject, Injectable } from '@angular/core';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { traceUntilFirst } from '@angular/fire/performance';
import { TranslateBatchData, TranslateBatchResult, TranslateSingleData } from '@shared/models/translate.model';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private readonly functions = inject(Functions);

  translate(data: TranslateSingleData): Observable<string> {
    const translate = httpsCallableData<TranslateSingleData, string>(this.functions, 'translate');
    return translate(data).pipe(tap(console.log), traceUntilFirst('Functions:Translate:translate'));
  }

  /**
   * Translate many fields in one call.
   *
   * The same callable as {@link translate}: passing `items` selects batch mode, which groups by
   * format and collapses the provider round-trips into one per chunk.
   */
  translateBatch(data: TranslateBatchData): Observable<TranslateBatchResult> {
    const translateBatch = httpsCallableData<TranslateBatchData, TranslateBatchResult>(this.functions, 'translate');
    return translateBatch(data).pipe(traceUntilFirst('Functions:Translate:translateBatch'));
  }
}
