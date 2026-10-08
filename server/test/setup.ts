import { Logger } from '@nestjs/common';

Logger.overrideLogger(['fatal', 'error', 'warn']);
