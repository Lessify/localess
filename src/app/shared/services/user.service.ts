import {Injectable} from '@angular/core';
import {from, Observable, of} from 'rxjs';
import {Functions, httpsCallableData} from '@angular/fire/functions';
import {User, UserInvite, UserUpdateFS} from '../models/user.model';
import {
  collection,
  collectionData, deleteDoc,
  doc,
  docData,
  Firestore,
  serverTimestamp,
  setDoc
} from '@angular/fire/firestore';
import {traceUntilFirst} from '@angular/fire/performance';
import {map, tap} from 'rxjs/operators';
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
        traceUntilFirst('firestore'),
        map((it) => it as User[])
      );
  }

  findById(id: string): Observable<User> {
    return docData(doc(this.firestore, `users/${id}`), {idField: 'id'})
      .pipe(
        traceUntilFirst('firestore'),
        map((it) => it as User)
      );
  }

  update(id: string, role: string): Observable<void> {
    const update: UserUpdateFS = {
      role: role,
      updatedOn: serverTimestamp()
    }
    return from(
      setDoc(doc(this.firestore, `users/${id}`),
        update,
        {merge: true}
      )
    )
      .pipe(
        traceUntilFirst('firestore'),
        tap(it => console.log(it))
      );
  }

  delete(id: string): Observable<void> {
    return from(
      deleteDoc(doc(this.firestore, `users/${id}`))
    )
      .pipe(
        traceUntilFirst('firestore'),
      );
  }

  invite(model: UserInvite): Observable<void> {
    const userInvite = httpsCallableData<UserInvite, void>(this.functions, 'userInvite');
    return userInvite(model)
  }

  sync(): Observable<void> {
    const usersSync = httpsCallableData<void, void>(this.functions, 'usersSync');
    return usersSync()
  }
}
