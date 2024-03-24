import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { Auth, updateEmail, updatePassword, updateProfile } from '@angular/fire/auth';
import { MeUpdate } from '../models/me.model';
import { traceUntilFirst } from '@angular/fire/performance';
import { tap } from 'rxjs/operators';

@Injectable()
export class MeService {
  constructor(private readonly auth: Auth) {}

  updateProfile(model: MeUpdate): Observable<void> {
    return from(updateProfile(this.auth.currentUser!, model)).pipe(
      traceUntilFirst('Firestore:Me:updateProfile'),
      tap(() => this.auth.currentUser?.reload())
    );
  }

  updateEmail(newEmail: string): Observable<void> {
    return from(updateEmail(this.auth.currentUser!, newEmail)).pipe(
      traceUntilFirst('Firestore:Me:updateEmail'),
      tap(() => this.auth.currentUser?.reload())
    );
  }

  updatePassword(newPassword: string): Observable<void> {
    return from(updatePassword(this.auth.currentUser!, newPassword)).pipe(traceUntilFirst('Firestore:Me:updatePassword'));
  }
}
