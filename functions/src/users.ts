import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { authService } from './config';
import { canPerform } from './utils/security-utils';
import { User, UserInvite, UserPermission, UserUpdate } from './models';

const userList = onCall<void>(async request => {
  logger.info('[userList] data: ' + JSON.stringify(request.data));
  logger.info('[userList] context.auth: ' + JSON.stringify(request.auth));
  if (!canPerform(UserPermission.USER_MANAGEMENT, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');

  const users = await authService.listUsers();
  return users.users.map(user => {
    return {
      id: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
      phoneNumber: user.phoneNumber,
      disabled: user.disabled,
      // Custom Claims
      role: user.customClaims?.['role'],
      permissions: user.customClaims?.['permissions'],
      lock: user.customClaims?.['lock'],
      // Providers
      providers: user.providerData.map(provider => provider.providerId),
      // Metadata
      creationTime: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime,
      lastRefreshTime: user.metadata.lastRefreshTime,
    } satisfies User;
  });
});

const userInvite = onCall<UserInvite>(async request => {
  const { auth, data } = request;
  logger.info('[userInvite] data: ' + JSON.stringify(data));
  logger.info('[userInvite] context.auth: ' + JSON.stringify(auth));
  if (!canPerform(UserPermission.USER_MANAGEMENT, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');

  const user = await authService.createUser({
    displayName: data.displayName,
    email: data.email,
    password: data.password,
    disabled: false,
  });
  await authService.setCustomUserClaims(user.uid, { role: data.role, permissions: data.permissions, lock: data.lock });
});

const userUpdate = onCall<UserUpdate>(async request => {
  const { auth, data } = request;
  logger.info('[userUpdate] data: ' + JSON.stringify(data));
  logger.info('[userUpdate] context.auth: ' + JSON.stringify(auth));
  if (!canPerform(UserPermission.USER_MANAGEMENT, auth)) throw new HttpsError('permission-denied', 'permission-denied');

  if (data.role === 'admin') {
    await authService.setCustomUserClaims(data.id, { role: data.role });
  } else if (data.role === 'custom') {
    await authService.setCustomUserClaims(data.id, { role: data.role, permissions: data.permissions, lock: data.lock });
  } else {
    await authService.setCustomUserClaims(data.id, null);
  }
});

const userDelete = onCall<string>(async request => {
  const { auth, data } = request;
  logger.info('[userUpdate] data: ' + JSON.stringify(data));
  logger.info('[userUpdate] context.auth: ' + JSON.stringify(auth));
  if (!canPerform(UserPermission.USER_MANAGEMENT, auth)) throw new HttpsError('permission-denied', 'permission-denied');

  await authService.deleteUser(data);
});

export const user = {
  list: userList,
  invite: userInvite,
  update: userUpdate,
  delete: userDelete,
};
