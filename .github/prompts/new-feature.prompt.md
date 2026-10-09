You are working on a new feature in Localess.

Read these docs for full context:
- [Concepts](../../docs/concepts.md) — Space, Content, Schema, Translation, Asset, Token
- [Publish Flow](../../docs/publish-flow.md) — how content becomes public
- [Auth Tokens](../../docs/auth-tokens.md) — API access model

Architecture:
- Angular 21 frontend in `apps/web/src/app/features/`
- NestJS + Postgres server in `apps/server/src/` (app API in `apps/server/src/app-api/`, schema in `apps/server/src/database/schema.ts`)
- Public API in `apps/server/src/public-api/`
- Server models in `apps/server/src/domain/models/`
