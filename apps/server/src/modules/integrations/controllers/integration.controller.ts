import {
  ADMINS,
  type Integration,
  type IntegrationEnabledUpdate,
  type IntegrationList,
  type IntegrationSave,
  type IntegrationTest,
  type IntegrationTestResult,
  type TranslatePrimaryUpdate,
} from '@localess/shared';
import { zIntegrationEnabledUpdate, zIntegrationSave, zIntegrationTest, zTranslatePrimaryUpdate } from '@localess/shared/zod';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';

import { RequireRole } from '../../../auth/decorators.js';
import { CurrentUser } from '../../../auth/request-context.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { IntegrationAdminService } from '../services/integration-admin.service.js';

/**
 * Admin → Settings → Integrations. Answers never carry a saved secret, only its hint. An env-locked integration answers
 * 409 to every change.
 */
@Controller('api/app/admin/integrations')
@RequireRole(ADMINS)
export class IntegrationController {
  constructor(private readonly integrationAdminService: IntegrationAdminService) {}

  @Get()
  findAll(): Promise<IntegrationList> {
    return this.integrationAdminService.findAll();
  }

  /** The primary translation provider (409 when LOCALESS_TRANSLATE_PRIMARY sets it). */
  @Put('translate-primary')
  updateTranslatePrimary(
    @CurrentUser() user: UserEntity,
    @Body({ schema: zTranslatePrimaryUpdate }) body: TranslatePrimaryUpdate,
  ): Promise<IntegrationList['translatePrimary']> {
    return this.integrationAdminService.updateTranslatePrimary(body, user.id);
  }

  /** One test call: with `values`, without saving them; without, the active configuration. */
  @Post(':id/test')
  @HttpCode(200)
  test(@Param('id') id: string, @Body({ schema: zIntegrationTest }) body: IntegrationTest): Promise<IntegrationTestResult> {
    return this.integrationAdminService.test(id, body);
  }

  /** Connect or replace: tested first (422 with the result when it fails), unless `skipTest`. */
  @Put(':id')
  update(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body({ schema: zIntegrationSave }) body: IntegrationSave,
  ): Promise<Integration> {
    return this.integrationAdminService.update(id, body, user.id);
  }

  @Patch(':id/enabled')
  updateEnabled(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body({ schema: zIntegrationEnabledUpdate }) body: IntegrationEnabledUpdate,
  ): Promise<Integration> {
    return this.integrationAdminService.updateEnabled(id, body, user.id);
  }

  /** Disconnect: the saved values are deleted. */
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): Promise<void> {
    return this.integrationAdminService.remove(id);
  }
}
