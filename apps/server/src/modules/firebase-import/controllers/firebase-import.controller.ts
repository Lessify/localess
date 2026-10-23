import type { FirebaseImport, FirebaseImportConnection, FirebaseImportStart, FirebaseSourceSpace } from '@localess/shared';
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

  /** A `POST`: the token travels in the body, never in a URL. */
  @Post('spaces')
  @HttpCode(200)
  findSourceSpaces(@Body({ schema: zFirebaseImportConnection }) body: FirebaseImportConnection): Promise<FirebaseSourceSpace[]> {
    return this.firebaseImportService.findSourceSpaces(body);
  }

  @Post()
  @HttpCode(202)
  start(@Body({ schema: zFirebaseImportStart }) body: FirebaseImportStart, @CurrentUser() user: UserEntity): Promise<FirebaseImport> {
    return this.firebaseImportService.start(body, user);
  }

  @Get()
  findAll(): Promise<FirebaseImport[]> {
    return this.firebaseImportService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', UuidParamPipe) id: string): Promise<FirebaseImport> {
    return this.firebaseImportService.findOne(id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id', UuidParamPipe) id: string, @CurrentUser() user: UserEntity): Promise<FirebaseImport> {
    return this.firebaseImportService.cancel(id, user);
  }
}
