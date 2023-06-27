import {Injectable} from '@angular/core';
import {from, Observable} from 'rxjs';
import {updateEmail, updatePassword, updateProfile, User} from '@angular/fire/auth';
import {MeUpdate} from '../models/me.model';
import {traceUntilFirst} from '@angular/fire/performance';

@Injectable()
export class MeService {
  constructor() {
  }

  updateProfile(user: User, model: MeUpdate): Observable<void> {
    return from(updateProfile(user, model))
      .pipe(
        traceUntilFirst('Firestore:Me:updateProfile'),
      );
  }

  updateEmail(user: User, newEmail: string): Observable<void> {
    return from(updateEmail(user, newEmail))
      .pipe(
        traceUntilFirst('Firestore:Me:updateEmail'),
      );
  }

  updatePassword(user: User, newPassword: string): Observable<void> {
    return from(updatePassword(user, newPassword))
      .pipe(
        traceUntilFirst('Firestore:Me:updatePassword'),
      );
  }
}
