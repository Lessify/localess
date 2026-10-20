import type { FirebaseImportConnection, FirebaseImportStart } from '@localess/shared';
import { ADMINS } from '@localess/shared';
import { zFirebaseImportConnection, zFirebaseImportStart } from '@localess/shared/zod';
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { CurrentUser } from '../../../auth/request-context.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { FirebaseImportService } from '../services/firebase-import.service.js';

/** Admin → Spaces → Import from Firebase. The migration token is used for the request and never stored. */
@Controller('api/app/admin/firebase-import')
@RequireRole(ADMINS)
export class FirebaseImportController {
  constructor(private readonly firebaseImportService: FirebaseImportService) {}

  @Post('spaces')
  @HttpCode(200)
  findSourceSpaces(@Body({ schema: zFirebaseImportConnection }) body: FirebaseImportConnection) {
    return this.firebaseImportService.findSourceSpaces(body.origin, body.token);
  }

  @Post()
  @HttpCode(202)
  start(@Body({ schema: zFirebaseImportStart }) body: FirebaseImportStart, @CurrentUser() user: UserEntity) {
    return this.firebaseImportService.start(body.origin, body.token, body.spaceId, user);
  }

  @Get()
  findAll() {
    return this.firebaseImportService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', UuidParamPipe) id: string) {
    return this.firebaseImportService.findOne(id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id', UuidParamPipe) id: string, @CurrentUser() user: UserEntity) {
    return this.firebaseImportService.cancel(id, user);
  }
}
