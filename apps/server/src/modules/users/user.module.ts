import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module.js';
import { MeController } from './controllers/me.controller.js';
import { UserController } from './controllers/user.controller.js';
import { FirstAdminRepository } from './repositories/first-admin.repository.js';
import { UserRepository } from './repositories/user.repository.js';
import { FirstAdminService } from './services/first-admin.service.js';
import { MeService } from './services/me.service.js';
import { UserService } from './services/user.service.js';

/** Admin → Users, the signed-in user's own profile, and the first admin (on boot, and the `admin:create` CLI). */
@Module({
  imports: [AuthModule],
  controllers: [MeController, UserController],
  providers: [UserService, MeService, FirstAdminService, UserRepository, FirstAdminRepository],
})
export class UserModule {}
