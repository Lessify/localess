import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { zFirebaseImportConnection, zFirebaseImportStart } from '@localess/shared/zod';
import type { FirebaseImportConnection, FirebaseImportStart } from '@localess/shared';
import { RequireAdmin } from '../../../auth/decorators.js';
import { CurrentUser } from '../../../auth/request-context.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { FirebaseImportService } from '../services/firebase-import.service.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';

/** Admin → Spaces → Import from Firebase. The migration token is used for the request and never stored. */
@Controller('api/app/admin/firebase-import')
@RequireAdmin()
export class FirebaseImportController {
  constructor(private readonly imports: FirebaseImportService) {}

  @Post('spaces')
  @HttpCode(200)
  findSourceSpaces(@Body({ schema: zFirebaseImportConnection }) body: FirebaseImportConnection) {
    return this.imports.findSourceSpaces(body.origin, body.token);
  }

  @Post()
  @HttpCode(202)
  start(@Body({ schema: zFirebaseImportStart }) body: FirebaseImportStart, @CurrentUser() user: UserEntity) {
    return this.imports.start(body.origin, body.token, body.spaceId, user);
  }

  @Get()
  findAll() {
    return this.imports.findAll();
  }

  @Get(':id')
  findOne(@Param('id', UuidParamPipe) id: string) {
    return this.imports.findOne(id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id', UuidParamPipe) id: string, @CurrentUser() user: UserEntity) {
    return this.imports.cancel(id, user);
  }
}
