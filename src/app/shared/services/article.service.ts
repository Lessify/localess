import {Injectable} from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  DocumentReference,
  Firestore,
  serverTimestamp,
  UpdateData,
  updateDoc
} from '@angular/fire/firestore';
import {from, Observable} from 'rxjs';
import {traceUntilFirst} from '@angular/fire/performance';
import {map} from 'rxjs/operators';
import {ObjectUtils} from '../../core/utils/object-utils.service';
import {
  Article,
  ArticleCreate,
  ArticleCreateFS,
  ArticleUpdate,
  ArticleUpdateFS
} from '@shared/models/article.model';

@Injectable()
export class ArticleService {
  constructor(
    private readonly firestore: Firestore
  ) {
  }

  findAll(spaceId: string): Observable<Article[]> {
    return collectionData(collection(this.firestore, `spaces/${spaceId}/articles`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Articles:findAll'),
        map((it) => it as Article[])
      );
  }

  findById(spaceId: string, id: string): Observable<Article> {
    return docData(doc(this.firestore, `spaces/${spaceId}/articles/${id}`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Articles:findById'),
        map((it) => it as Article)
      );
  }

  create(spaceId: string, entity: ArticleCreate): Observable<DocumentReference> {
    let addEntity: ArticleCreateFS = {
      name: entity.name,
      slug: entity.slug,
      schematicId: entity.schematicId,
      createdOn: serverTimestamp(),
      updatedOn: serverTimestamp()
    }

    return from(
      addDoc(collection(this.firestore, `spaces/${spaceId}/articles`),
        addEntity
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Articles:create'),
      );
  }

  update(spaceId: string, id: string, entity: ArticleUpdate): Observable<void> {
    ObjectUtils.clean(entity);
    const update: UpdateData<ArticleUpdateFS> = {
      name: entity.name,
      slug: entity.slug,
      updatedOn: serverTimestamp()
    }

    return from(
      updateDoc(doc(this.firestore, `spaces/${spaceId}/articles/${id}`),
        update
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Articles:update'),
      );
  }

  delete(spaceId: string, id: string): Observable<void> {
    return from(
      deleteDoc(doc(this.firestore, `spaces/${spaceId}/articles/${id}`))
    )
      .pipe(
        traceUntilFirst('Firestore:Articles:delete'),
      );
  }

}
