import type { MeEmailUpdate, MePasswordUpdate, MeUpdate, User } from '@localess/shared';
import { zMeEmailUpdate, zMePasswordUpdate, zMeUpdate } from '@localess/shared/zod';
import { Body, Controller, HttpCode, Patch, Put } from '@nestjs/common';

import { CurrentSessionId, CurrentUser } from '../../../auth/request-context.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { MeService } from '../services/me.service.js';

/** The signed-in user's own profile: name and photo, email, password. Who is signed in is `GET /api/auth/me`. */
@Controller('api/app/me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Patch()
  async updateProfile(@CurrentUser() user: UserEntity, @Body({ schema: zMeUpdate }) body: MeUpdate): Promise<User> {
    return this.meService.updateProfile(user, body);
  }

  @Put('email')
  async updateEmail(@CurrentUser() user: UserEntity, @Body({ schema: zMeEmailUpdate }) body: MeEmailUpdate): Promise<User> {
    return this.meService.updateEmail(user, body);
  }

  /** Changing the password signs out every other session. */
  @Put('password')
  @HttpCode(204)
  async updatePassword(
    @CurrentUser() user: UserEntity,
    @CurrentSessionId() sessionId: string,
    @Body({ schema: zMePasswordUpdate }) body: MePasswordUpdate,
  ): Promise<void> {
    await this.meService.updatePassword(user, sessionId, body);
  }
}
