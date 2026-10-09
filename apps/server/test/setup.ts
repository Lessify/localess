import { Logger } from '@nestjs/common';
import { afterAll } from 'vitest';

Logger.overrideLogger(['fatal', 'error', 'warn']);

afterAll(() => {
  delete process.env['LOCALESS_LOGIN_RATE_LIMIT'];
});
