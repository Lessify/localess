import {AuthData} from 'firebase-functions/lib/common/providers/https';

export class SecurityUtils {
  static hasRole(role: string, auth?: AuthData): boolean {
    return auth?.token['role'] === role;
  }

  static hasAnyRole(roles: string[], auth?: AuthData) {
    if (auth?.token['role']) {
      return roles.includes(auth.token['role']);
    }
    return false;
  }
}
