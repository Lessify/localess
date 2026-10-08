You are working on a new feature in Localess.

Read these docs for full context:
- [Concepts](../docs/concepts.md) — Space, Content, Schema, Translation, Asset, Token
- [Publish Flow](../docs/publish-flow.md) — how content becomes public
- [Auth Tokens](../docs/auth-tokens.md) — API access model

Architecture:
- Angular 21 frontend in `src/app/features/`
- NestJS + Postgres server in `server/src/` (app API in `server/src/app-api/`, schema in `server/src/database/schema.ts`)
- Public API in `server/src/public-api/`
- Server models in `server/src/domain/models/`
