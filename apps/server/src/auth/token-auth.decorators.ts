import { applyDecorators, SetMetadata, UseFilters, UseGuards } from '@nestjs/common';

import { V1ExceptionFilter } from '../infra/http/v1/v1-error.js';
import { AUTH_KIND, type AuthKind, CDN_TOKEN_RULE, type CdnTokenRule } from './decorators.js';
import { CdnTokenGuard } from './guards/cdn-token.guard.js';
import { ManagementTokenGuard } from './guards/management-token.guard.js';

/** A CDN API route: `?token=` with a public or preview token, by `rule`. On a class, every handler; a handler may override. */
export const CdnToken = (rule: CdnTokenRule) =>
  applyDecorators(
    SetMetadata(AUTH_KIND, 'cdn-token' satisfies AuthKind),
    SetMetadata(CDN_TOKEN_RULE, rule),
    UseGuards(CdnTokenGuard),
    UseFilters(V1ExceptionFilter),
  );

/** A Management API controller: `Authorization: Bearer` with a management token, on every handler. */
export const ManagementToken = () =>
  applyDecorators(
    SetMetadata(AUTH_KIND, 'management-token' satisfies AuthKind),
    UseGuards(ManagementTokenGuard),
    UseFilters(V1ExceptionFilter),
  );
