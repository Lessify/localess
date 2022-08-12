import {Injectable} from '@angular/core';
import {from, Observable} from 'rxjs';
import {Functions} from '@angular/fire/functions';
import {User, UserUpdateFS} from '../models/user.model';
import {
  collection,
  collectionData,
  doc,
  docData,
  Firestore,
  serverTimestamp, setDoc
} from '@angular/fire/firestore';
import {traceUntilFirst} from '@angular/fire/performance';
import {map, tap} from 'rxjs/operators';
import {Translation} from '../models/translation.model';
import {SpaceDialogModel} from '../../features/spaces/space-dialog/space-dialog.model';
import {SpaceUpdateFS} from '../models/space.model';
import {UserDialogModel} from '../../features/users/user-dialog/user-dialog.model';


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

}
