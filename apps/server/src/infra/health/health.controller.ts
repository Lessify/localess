import { Controller, Get, Inject } from '@nestjs/common';
import type { Pool } from 'pg';
import { Public } from '../../auth/decorators.js';
import { PG_POOL } from '../database/database.module.js';

@Public()
@Controller('api/health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async check(): Promise<{ status: 'ok' }> {
    await this.pool.query('select 1');
    return { status: 'ok' };
  }
}
