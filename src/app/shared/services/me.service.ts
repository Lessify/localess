import { Injectable, inject } from '@angular/core';
import { Auth, updateEmail, updatePassword, updateProfile } from '@angular/fire/auth';
import { traceUntilFirst } from '@angular/fire/performance';
import { from, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MeUpdate } from '../models/me.model';

@Injectable({ providedIn: 'root' })
export class MeService {
  private readonly auth = inject(Auth);

  updateProfile(model: MeUpdate): Observable<void> {
    return from(updateProfile(this.auth.currentUser!, model)).pipe(
      traceUntilFirst('Firestore:Me:updateProfile'),
      tap(() => this.auth.currentUser?.reload()),
    );
  }

  updateEmail(newEmail: string): Observable<void> {
    return from(updateEmail(this.auth.currentUser!, newEmail)).pipe(
      traceUntilFirst('Firestore:Me:updateEmail'),
      tap(() => this.auth.currentUser?.reload()),
    );
  }

  updatePassword(newPassword: string): Observable<void> {
    return from(updatePassword(this.auth.currentUser!, newPassword)).pipe(traceUntilFirst('Firestore:Me:updatePassword'));
  }
}
