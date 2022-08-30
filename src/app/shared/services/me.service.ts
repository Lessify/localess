import {Injectable} from '@angular/core';
import {from, Observable} from 'rxjs';
import {updateEmail, updatePassword, updateProfile, User} from '@angular/fire/auth';
import {MeUpdate} from '../models/me.model';

@Injectable()
export class MeService {
  constructor() {
  }

  update(user: User, model: MeUpdate): Observable<void> {
    return from(
      updateProfile(user, model)
    );
  }

  updateEmail(user: User, newEmail: string): Observable<void> {
    return from(
      updateEmail(user, newEmail)
    )
  }

  updatePassword(user: User, newPassword: string): Observable<void> {
    return from(
      updatePassword(user, newPassword)
    )
  }
}
