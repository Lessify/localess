You are working on a new feature in Localess.

Read these docs for full context:
- [Concepts](../../docs/concepts.md) — Space, Content, Schema, Translation, Asset, Token
- [Publish Flow](../../docs/publish-flow.md) — how content becomes public
- [Auth Tokens](../../docs/auth-tokens.md) — API access model

Architecture:
- Angular 22 frontend in `apps/web/src/app/features/`
- NestJS + Postgres server in `apps/server/src/` (one folder per feature in `apps/server/src/modules/<feature>/` with its App API and public controllers; schema in `apps/server/src/infra/database/schema.ts`)
- Domain models, zod validators and permission rules in `packages/shared/src/` (`@localess/shared`), used by both server and web
