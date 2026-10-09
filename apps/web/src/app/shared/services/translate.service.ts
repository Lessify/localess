import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslateBatchData, TranslateBatchResult, TranslateSingleData } from '@localess/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Machine translation (`POST /api/app/translate`). */
@Injectable({ providedIn: 'root' })
export class TranslateService {
  private readonly http = inject(HttpClient);

  translate(data: TranslateSingleData): Observable<string> {
    const body: TranslateSingleData = { sourceLocale: data.sourceLocale, targetLocale: data.targetLocale, content: data.content };
    if (data.format) {
      body.format = data.format;
    }
    return this.http.post<{ content: string }>('/api/app/translate', body).pipe(map(it => it.content));
  }

  /** Translate many fields in one call: passing `items` selects batch mode on the same endpoint. */
  translateBatch(data: TranslateBatchData): Observable<TranslateBatchResult> {
    return this.http.post<TranslateBatchResult>('/api/app/translate', {
      sourceLocale: data.sourceLocale,
      targetLocale: data.targetLocale,
      items: data.items,
    });
  }
}
