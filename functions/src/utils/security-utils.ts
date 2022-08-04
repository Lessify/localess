import {AuthData} from 'firebase-functions/lib/common/providers/https';


export class SecurityUtils {
  /**
   * Check roles of authenticated user
   * @param role
   * @param auth
   */
  static hasRole(role: string, auth?: AuthData): boolean {
    return auth?.token['role'] === role;
  }

  /**
   * Check roles of authenticated user
   * @param roles
   * @param auth
   */
  static hasAnyRole(roles: string[], auth?: AuthData) {
    if (auth?.token['role']) {
      return roles.includes(auth.token['role']);
    }
    return false;
  }
}
