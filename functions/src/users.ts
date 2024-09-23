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
  logger.info('[userInvite] data: ' + JSON.stringify(request.data));
  logger.info('[userInvite] context.auth: ' + JSON.stringify(request.auth));
  if (!canPerform(UserPermission.USER_MANAGEMENT, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const { data } = request;
  const user = await authService.createUser({
    displayName: data.displayName,
    email: data.email,
    password: data.password,
    disabled: false,
  });
  await authService.setCustomUserClaims(user.uid, { role: data.role, permissions: data.permissions });
});

const userUpdate = onCall<UserUpdate>(async request => {
  logger.info('[userUpdate] data: ' + JSON.stringify(request.data));
  logger.info('[userUpdate] context.auth: ' + JSON.stringify(request.auth));
  if (!canPerform(UserPermission.USER_MANAGEMENT, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const { data } = request;
  if (data.role === 'admin') {
    await authService.setCustomUserClaims(data.id, { role: data.role });
  } else if (data.role === 'custom') {
    await authService.setCustomUserClaims(data.id, { role: data.role, permissions: data.permissions });
  } else {
    await authService.setCustomUserClaims(data.id, null);
  }
});

const userDelete = onCall<string>(async request => {
  logger.info('[userUpdate] data: ' + JSON.stringify(request.data));
  logger.info('[userUpdate] context.auth: ' + JSON.stringify(request.auth));
  if (!canPerform(UserPermission.USER_MANAGEMENT, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const { data } = request;
  await authService.deleteUser(data);
});

export const user = {
  list: userList,
  invite: userInvite,
  update: userUpdate,
  delete: userDelete,
};
