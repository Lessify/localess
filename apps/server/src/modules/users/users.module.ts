import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { MeController } from './controllers/me.controller.js';
import { UsersController } from './controllers/users.controller.js';
import { FirstAdminRepository } from './repositories/first-admin.repository.js';
import { UsersRepository } from './repositories/users.repository.js';
import { FirstAdminService } from './services/first-admin.service.js';
import { MeService } from './services/me.service.js';
import { UsersService } from './services/users.service.js';

/** Admin → Users, the signed-in user's own profile, and the first admin (on boot, and the `admin:create` CLI). */
@Module({
  imports: [AuthModule],
  controllers: [MeController, UsersController],
  providers: [UsersService, MeService, FirstAdminService, UsersRepository, FirstAdminRepository],
})
export class UsersModule {}
