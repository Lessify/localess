import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Functions, httpsCallableData} from '@angular/fire/functions';
import {ListUsersResult} from '../models/user.model';


@Injectable()
export class UserService {
  constructor(
    private readonly functions: Functions,
  ) {
  }

  findAll(): Observable<ListUsersResult> {
    const getUsers = httpsCallableData<void, ListUsersResult>(this.functions, 'getUsers');
    return getUsers()
  }
}
