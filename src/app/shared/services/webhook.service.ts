import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  Firestore,
  orderBy,
  query,
  serverTimestamp,
  UpdateData,
  updateDoc,
} from '@angular/fire/firestore';
import { traceUntilFirst } from '@angular/fire/performance';
import { WebHook, WebHookCreate, WebHookFS, WebHookLog, WebHookUpdate } from '@shared/models/webhook.model';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { WithFieldValue } from '@firebase/firestore';

@Injectable({ providedIn: 'root' })
export class WebHookService {
  private readonly firestore = inject(Firestore);

  findAll(spaceId: string): Observable<WebHook[]> {
    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/webhooks`), orderBy('name', 'asc')), {
      idField: 'id',
    }).pipe(
      traceUntilFirst('Firestore:WebHooks:findAll'),
      map(it => it as WebHook[]),
    );
  }

  findById(spaceId: string, id: string): Observable<WebHook> {
    return docData(doc(this.firestore, `spaces/${spaceId}/webhooks/${id}`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:WebHooks:findById'),
      map(it => it as WebHook),
    );
  }

  create(spaceId: string, entity: WebHookCreate): Observable<string> {
    const addEntity: WithFieldValue<WebHookFS> = {
      name: entity.name,
      url: entity.url,
      enabled: true,
      events: entity.events,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (entity.headers) {
      addEntity.headers = entity.headers;
    }
    if (entity.secret) {
      addEntity.secret = entity.secret;
    }
    return from(addDoc(collection(this.firestore, `spaces/${spaceId}/webhooks`), addEntity)).pipe(
      traceUntilFirst('Firestore:WebHooks:create'),
      map(ref => ref.id),
    );
  }

  update(spaceId: string, id: string, entity: WebHookUpdate): Observable<void> {
    const update: UpdateData<WebHookFS> = {
      name: entity.name,
      url: entity.url,
      events: entity.events,
      updatedAt: serverTimestamp(),
    };
    if (entity.headers) {
      update.headers = entity.headers;
    }
    if (entity.secret) {
      update.secret = entity.secret;
    }
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/webhooks/${id}`), update)).pipe(
      traceUntilFirst('Firestore:WebHooks:update'),
    );
  }

  updateStatus(spaceId: string, id: string, enabled: boolean): Observable<void> {
    const update: UpdateData<WebHookFS> = {
      enabled: enabled,
      updatedAt: serverTimestamp(),
    };
    return from(updateDoc(doc(this.firestore, `spaces/${spaceId}/webhooks/${id}`), update)).pipe(
      traceUntilFirst('Firestore:WebHooks:updateStatus'),
    );
  }

  delete(spaceId: string, id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `spaces/${spaceId}/webhooks/${id}`))).pipe(traceUntilFirst('Firestore:WebHooks:delete'));
  }

  findLogs(spaceId: string, webhookId: string): Observable<WebHookLog[]> {
    return collectionData(query(collection(this.firestore, `spaces/${spaceId}/webhooks/${webhookId}/logs`), orderBy('createdAt', 'desc')), {
      idField: 'id',
    }).pipe(
      traceUntilFirst('Firestore:WebHooks:findLogs'),
      map(it => it as WebHookLog[]),
    );
  }
}
