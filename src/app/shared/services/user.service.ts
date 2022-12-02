import {Injectable} from '@angular/core';
import {from, Observable} from 'rxjs';
import {Functions, httpsCallableData} from '@angular/fire/functions';
import {User, UserInvite, UserUpdateFS} from '../models/user.model';
import {
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  Firestore,
  serverTimestamp,
  setDoc
} from '@angular/fire/firestore';
import {traceUntilFirst} from '@angular/fire/performance';
import {map} from 'rxjs/operators';
import {userInvite, usersSync} from '../../../../functions/src';

@Injectable()
export class UserService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
  ) {
  }

  findAll(): Observable<User[]> {
    return collectionData(collection(this.firestore, 'users'), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Users:findAll'),
        map((it) => it as User[])
      );
  }

  findById(id: string): Observable<User> {
    return docData(doc(this.firestore, `users/${id}`), {idField: 'id'})
      .pipe(
        traceUntilFirst('Firestore:Users:findById'),
        map((it) => it as User)
      );
  }

  update(id: string, role: string): Observable<void> {
    const update: UserUpdateFS = {
      role: role,
      updatedAt: serverTimestamp()
    }
    return from(
      setDoc(doc(this.firestore, `users/${id}`),
        update,
        {merge: true}
      )
    )
      .pipe(
        traceUntilFirst('Firestore:Users:update'),
      );
  }

  delete(id: string): Observable<void> {
    return from(
      deleteDoc(doc(this.firestore, `users/${id}`))
    )
      .pipe(
        traceUntilFirst('Firestore:Users:delete'),
      );
  }

  invite(model: UserInvite): Observable<void> {
    const userInvite = httpsCallableData<UserInvite, void>(this.functions, 'userInvite');
    return userInvite(model)
      .pipe(
        traceUntilFirst('Firestore:Users:invite'),
      )
  }

  sync(): Observable<void> {
    const usersSync = httpsCallableData<void, void>(this.functions, 'usersSync');
    return usersSync()
      .pipe(
        traceUntilFirst('Functions:Users:sync'),
      )
  }
}
