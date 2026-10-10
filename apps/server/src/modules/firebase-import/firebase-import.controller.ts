import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { RequireAdmin } from '../../auth/decorators.js';
import { CurrentUser } from '../../auth/request-context.js';
import type { UserRow } from '../../auth/users/users.service.js';
import { UuidParamPipe } from '../../infra/http/uuid-param.pipe.js';
import { ZodValidationPipe } from '../../infra/http/zod-validation.pipe.js';
import { FirebaseImportService } from './firebase-import.service.js';

const connection = z.object({ origin: z.string().min(1).max(2048), token: z.string().min(1).max(500) });
const startSchema = connection.extend({ spaceId: z.string().min(1).max(128) });

/** Admin → Spaces → Import from Firebase. The migration token is used for the request and never stored. */
@Controller('api/app/admin/firebase-import')
@RequireAdmin()
export class FirebaseImportController {
  constructor(private readonly imports: FirebaseImportService) {}

  @Post('spaces')
  @HttpCode(200)
  spaces(@Body(new ZodValidationPipe(connection)) body: z.infer<typeof connection>) {
    return this.imports.sourceSpaces(body.origin, body.token);
  }

  @Post()
  @HttpCode(202)
  start(@Body(new ZodValidationPipe(startSchema)) body: z.infer<typeof startSchema>, @CurrentUser() user: UserRow) {
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
}
