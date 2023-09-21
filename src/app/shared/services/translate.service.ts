import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { traceUntilFirst } from '@angular/fire/performance';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { TranslateData } from '@shared/models/translate.model';
import { environment } from '../../../environments/environment';

@Injectable()
export class TranslateService {
  constructor(private readonly functions: Functions) {}

  translate(data: TranslateData): Observable<string | undefined> {
    const translate = httpsCallableData<TranslateData, string | undefined>(this.functions, 'translate');
    if (environment.production) {
      return translate(data).pipe(traceUntilFirst('Functions:Translate:translate'));
    } else {
      return of(`${data.sourceLocale}-${data.targetLocale} -> ${data.content}`);
    }
  }
}
