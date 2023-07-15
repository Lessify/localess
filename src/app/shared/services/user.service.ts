import {Injectable} from '@angular/core';
import {from, Observable} from 'rxjs';
import {Functions, httpsCallableData} from '@angular/fire/functions';
import {User, UserInvite, UserUpdateFS} from '../models/user.model';
import {
  collection,
  collectionData,
  deleteDoc,
  deleteField,
  doc,
  docData,
  Firestore,
  serverTimestamp,
  setDoc,
  UpdateData
} from '@angular/fire/firestore';
import {traceUntilFirst} from '@angular/fire/performance';
import {map} from 'rxjs/operators';

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

  update(id: string, role?: string, permissions?: string[]): Observable<void> {
    const update: UpdateData<UserUpdateFS> = {
      role: role,
      permissions: permissions,
      updatedAt: serverTimestamp()
    }
    switch (role) {
      case 'admin': {
        update.role = role;
        update.permissions = deleteField();
        break;
      }
      case 'custom': {
        update.role = role;
        update.permissions = permissions;
        break;
      }
      case undefined : {
        update.role = deleteField();
        update.permissions = deleteField();
        break;
      }
    }

    return from(setDoc(doc(this.firestore, `users/${id}`), update, {merge: true}))
      .pipe(
        traceUntilFirst('Firestore:Users:update'),
      );
  }

  delete(id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, `users/${id}`)))
      .pipe(
        traceUntilFirst('Firestore:Users:delete'),
      );
  }

  invite(model: UserInvite): Observable<void> {
    const userInvite = httpsCallableData<UserInvite, void>(this.functions, 'userinvite');
    return userInvite(model)
      .pipe(
        traceUntilFirst('Firestore:Users:invite'),
      )
  }

  sync(): Observable<void> {
    const usersSync = httpsCallableData<void, void>(this.functions, 'userssync');
    return usersSync()
      .pipe(
        traceUntilFirst('Functions:Users:sync'),
      )
  }
}
