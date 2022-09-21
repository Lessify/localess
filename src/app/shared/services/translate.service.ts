import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {traceUntilFirst} from '@angular/fire/performance';
import {Functions, httpsCallableData} from '@angular/fire/functions';
import {TranslateData} from '@shared/models/translate.model';


@Injectable()
export class TranslateService {
  constructor(
    private readonly functions: Functions,
  ) {
  }

  translate(data: TranslateData): Observable<string | undefined> {
    const translate = httpsCallableData<TranslateData, string | undefined>(this.functions, 'translate');
    return translate(data)
      .pipe(
        traceUntilFirst('Functions:Translate:translate'),
      );
  }

}
