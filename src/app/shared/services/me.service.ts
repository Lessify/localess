import {Injectable} from '@angular/core';
import {from, Observable} from 'rxjs';
import {Functions} from '@angular/fire/functions';
import {Firestore} from '@angular/fire/firestore';
import {Auth, updateEmail, updateProfile, user} from '@angular/fire/auth';
import {MeUpdate} from '../models/me.model';
import {filter, switchMap} from 'rxjs/operators';

@Injectable()
export class MeService {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
    private readonly auth: Auth,
  ) {
  }

  update(model: MeUpdate): Observable<void> {
    return user(this.auth)
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          from(
            updateProfile(it!, model)
          )
        )
      );
  }

  updateEmail(newEmail: string): Observable<void> {
    return user(this.auth)
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          from(
            updateEmail(it!, newEmail)
          )
        )
      );
  }

  updatePassword(newPassword: string): Observable<void> {
    return user(this.auth)
      .pipe(
        filter(it => it !== undefined),
        switchMap(it =>
          from(
            updateEmail(it!, newPassword)
          )
        )
      );
  }
}
