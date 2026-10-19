import { Body, Controller, Get, HttpCode, Patch, Put } from '@nestjs/common';
import { CurrentSessionId, CurrentUser } from '../../../auth/request-context.js';
import type { UserRow } from '../../../shared/models/user.js';
import type { UserDto } from '../../../shared/transformers/user.transformer.js';
import {
  type MeEmailUpdate,
  type MePasswordUpdate,
  type MeProfileUpdate,
  zMeEmailUpdate,
  zMePasswordUpdate,
  zMeProfileUpdate,
} from '../models/me.models.js';
import { MeService } from '../services/me.service.js';

/** The signed-in user's own profile (was `updateProfile` / `updateEmail` / `updatePassword` on Firebase Auth). */
@Controller('api/app/me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  async findOne(@CurrentUser() user: UserRow): Promise<UserDto> {
    return this.me.findOne(user);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: UserRow,
    @Body({ schema: zMeProfileUpdate }) body: MeProfileUpdate,
  ): Promise<UserDto> {
    return this.me.updateProfile(user, body);
  }

  @Put('email')
  async updateEmail(
    @CurrentUser() user: UserRow,
    @Body({ schema: zMeEmailUpdate }) body: MeEmailUpdate,
  ): Promise<UserDto> {
    return this.me.updateEmail(user, body.email, body.currentPassword);
  }

  /** Changing the password signs out every other session. */
  @Put('password')
  @HttpCode(204)
  async updatePassword(
    @CurrentUser() user: UserRow,
    @CurrentSessionId() sessionId: string,
    @Body({ schema: zMePasswordUpdate }) body: MePasswordUpdate,
  ): Promise<void> {
    await this.me.updatePassword(user, sessionId, body.currentPassword, body.newPassword);
  }
}
