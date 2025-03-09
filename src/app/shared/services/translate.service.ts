import { Injectable } from '@angular/core';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { traceUntilFirst } from '@angular/fire/performance';
import { TranslateData } from '@shared/models/translate.model';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TranslateService {
  constructor(private readonly functions: Functions) {}

  translate(data: TranslateData): Observable<string | undefined> {
    const translate = httpsCallableData<TranslateData, string | undefined>(this.functions, 'translate');
    return translate(data).pipe(tap(console.log), traceUntilFirst('Functions:Translate:translate'));
  }
}
