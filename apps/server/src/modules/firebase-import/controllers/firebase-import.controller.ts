import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { RequireAdmin } from '../../../auth/decorators.js';
import { CurrentUser } from '../../../auth/request-context.js';
import type { UserRow } from '../../../shared/models/user.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import { type FirebaseConnection, type FirebaseImportStart, zFirebaseConnection, zFirebaseImportStart } from '../models/firebase-import.models.js';
import { FirebaseImportService } from '../services/firebase-import.service.js';

/** Admin → Spaces → Import from Firebase. The migration token is used for the request and never stored. */
@Controller('api/app/admin/firebase-import')
@RequireAdmin()
export class FirebaseImportController {
  constructor(private readonly imports: FirebaseImportService) {}

  @Post('spaces')
  @HttpCode(200)
  spaces(@Body(new ZodValidationPipe(zFirebaseConnection)) body: FirebaseConnection) {
    return this.imports.sourceSpaces(body.origin, body.token);
  }

  @Post()
  @HttpCode(202)
  start(@Body(new ZodValidationPipe(zFirebaseImportStart)) body: FirebaseImportStart, @CurrentUser() user: UserRow) {
    return this.imports.start(body.origin, body.token, body.spaceId, user);
  }

  @Get()
  list() {
    return this.imports.list();
  }

  @Get(':id')
  get(@Param('id', UuidParamPipe) id: string) {
    return this.imports.get(id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id', UuidParamPipe) id: string, @CurrentUser() user: UserRow) {
    return this.imports.cancel(id, user);
  }
}
