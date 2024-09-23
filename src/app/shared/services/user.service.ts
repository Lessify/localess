import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Functions, httpsCallableData } from '@angular/fire/functions';
import { User, UserInvite, UserUpdate } from '../models/user.model';
import { Firestore } from '@angular/fire/firestore';
import { traceUntilFirst } from '@angular/fire/performance';

@Injectable()
export class UserService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
  ) {}

  findAll(): Observable<User[]> {
    const list = httpsCallableData<void, User[]>(this.functions, 'user-list');
    return list().pipe(traceUntilFirst('Functions:Users:list'));
  }

  invite(model: UserInvite): Observable<void> {
    const userInvite = httpsCallableData<UserInvite, void>(this.functions, 'user-invite');
    return userInvite(model).pipe(traceUntilFirst('Functions:Users:invite'));
  }

  update(model: UserUpdate): Observable<void> {
    const userInvite = httpsCallableData<UserUpdate, void>(this.functions, 'user-update');
    return userInvite(model).pipe(traceUntilFirst('Functions:Users:update'));
  }

  delete(id: string): Observable<void> {
    const userDelete = httpsCallableData<string, void>(this.functions, 'user-delete');
    return userDelete(id).pipe(traceUntilFirst('Functions:Users:delete'));
  }
}
