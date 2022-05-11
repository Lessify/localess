import {Injectable} from '@angular/core';
import {collection, collectionData, Firestore} from '@angular/fire/firestore';
import {Observable} from 'rxjs';
import {Translation} from '../models/translation.model';
import {traceUntilFirst} from '@angular/fire/performance';
import {map} from 'rxjs/operators';

@Injectable()
export class TranslationService {
  constructor(private firestore: Firestore) {
  }

  findAll(spaceId: string): Observable<Translation[]> {
    return collectionData(collection(this.firestore, `spaces/${spaceId}/translations`), {idField: 'id'})
    .pipe(
      traceUntilFirst('firestore'),
      map((it) => it as Translation[])
    );
  }

}
