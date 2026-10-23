import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslateBatchData, TranslateBatchResult, TranslateData, TranslateSingleData, TranslateTextResult } from '@localess/shared';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Machine translation (`POST /api/app/translate`, the server's `TranslateController`). */
@Injectable({ providedIn: 'root' })
export class TranslateService {
  private readonly http = inject(HttpClient);

  /** One text, or with `items` many in one call (batch mode on the same endpoint); `translate` and `translateBatch` fill the body. */
  translateText(body: TranslateSingleData): Observable<TranslateTextResult>;
  translateText(body: TranslateBatchData): Observable<TranslateBatchResult>;
  translateText(body: TranslateData): Observable<TranslateTextResult | TranslateBatchResult> {
    return this.http.post<TranslateTextResult | TranslateBatchResult>('/api/app/translate', body);
  }

  translate(data: TranslateSingleData): Observable<string> {
    const body: TranslateSingleData = { sourceLocale: data.sourceLocale, targetLocale: data.targetLocale, content: data.content };
    if (data.format) {
      body.format = data.format;
    }
    return this.translateText(body).pipe(map(it => it.content));
  }

  /** Translate many fields in one call: passing `items` selects batch mode on the same endpoint. */
  translateBatch(data: TranslateBatchData): Observable<TranslateBatchResult> {
    return this.translateText({
      sourceLocale: data.sourceLocale,
      targetLocale: data.targetLocale,
      items: data.items,
    });
  }
}
