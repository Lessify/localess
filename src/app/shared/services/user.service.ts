import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { User, UserInvite, UserUpdate } from '../models/user.model';
import {
  collection,
  collectionData,
  deleteDoc,
  deleteField,
  doc,
  docData,
  Firestore,
  serverTimestamp,
  UpdateData,
  updateDoc,
} from '@angular/fire/firestore';
import { traceUntilFirst } from '@angular/fire/performance';
import { map } from 'rxjs/operators';

@Injectable()
export class UserService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
  ) {}

  findAll(): Observable<User[]> {
    return collectionData(collection(this.firestore, 'users'), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Users:findAll'),
      map(it => it as User[]),
    );
  }

  findById(id: string): Observable<User> {
    return docData(doc(this.firestore, `users/${id}`), { idField: 'id' }).pipe(
      traceUntilFirst('Firestore:Users:findById'),
      map(it => it as User),
    );
  }

  update(id: string, model: UserUpdate): Observable<void> {
    const update: UpdateData<User> = {
      updatedAt: serverTimestamp(),
    };
    switch (model.role) {
      case 'admin': {
        update.role = model.role;
        update.permissions = deleteField();
        break;
      }
      case 'custom': {
        update.role = model.role;
        update.permissions = model.permissions;
        update.lock = model.lock;
        break;
      }
      case undefined: {
        update.role = deleteField();
        update.permissions = deleteField();
        update.lock = deleteField();
        break;
      }
    }
    return from(updateDoc(doc(this.firestore, `users/${id}`), update)).pipe(traceUntilFirst('Firestore:Users:update'));
  }

  delete(id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `users/${id}`))).pipe(traceUntilFirst('Firestore:Users:delete'));
  }

  invite(model: UserInvite): Observable<void> {
    const userInvite = httpsCallableData<UserInvite, void>(this.functions, 'user-invite');
    return userInvite(model).pipe(traceUntilFirst('Functions:Users:invite'));
  }

  sync(): Observable<void> {
    const usersSync = httpsCallableData<void, void>(this.functions, 'user-sync');
    return usersSync().pipe(traceUntilFirst('Functions:Users:sync'));
  }
}
