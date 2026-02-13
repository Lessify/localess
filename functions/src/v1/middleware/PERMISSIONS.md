# V1 API Endpoints - Permission Matrix

| Endpoint | Method | Required Permissions | Notes                                    |
|----------|--------|-------------------|------------------------------------------|
| `/api/v1/spaces/:spaceId` | GET | DEV_TOOLS | Space metadata                           |
| `/api/v1/spaces/:spaceId/translations/:locale` | GET | PUBLIC \| DRAFT \| DEV_TOOLS | Translation files                        |
| `/api/v1/spaces/:spaceId/translations/:locale` | POST | DRAFT \| DEV_TOOLS | Update translations                      |
| `/api/v1/spaces/:spaceId/links` | GET | PUBLIC \| DRAFT \| DEV_TOOLS | Content links                            |
| `/api/v1/spaces/:spaceId/contents/slugs/*slug` | GET | **Conditional** | Published: PUBLIC \| DRAFT,<br>  Draft: DRAFT |
| `/api/v1/spaces/:spaceId/contents/:contentId` | GET | **Conditional** | Published: PUBLIC \| DRAFT,<br>  Draft: DRAFT |
| `/api/v1/spaces/:spaceId/open-api` | GET | DEV_TOOLS | OpenAPI schema                           |
| `/api/v1/spaces/:spaceId/assets/:assetId` | GET | None | Public asset access                      |

## Conditional Permissions

Content endpoints (`/contents/:contentId` and `/contents/slugs/*`) use conditional logic:
- **Without `version` parameter**: Requires `PUBLIC` OR `DRAFT` permission (published content)
- **With `version` parameter**: Requires `DRAFT` permission only (draft/preview content)

## Usage Examples

```typescript
// Basic endpoint with multiple permissions
router.get(
  '/api/v1/spaces/:spaceId',
  requireTokenPermissions([TokenPermission.PUBLIC, TokenPermission.DRAFT, TokenPermission.DEV_TOOLS]),
  async (req: RequestWithToken, res) => {
    // Handler code
  }
);

// Endpoint with single permission
router.get(
  '/api/v1/spaces/:spaceId/open-api',
  requireTokenPermissions([TokenPermission.DEV_TOOLS]),
  async (req: RequestWithToken, res) => {
    // Handler code
  }
);

// Content endpoint with conditional logic
router.get(
  '/api/v1/spaces/:spaceId/contents/:contentId',
  requireContentPermissions(),
  async (req: RequestWithToken, res) => {
    // Handler code
  }
);
```

## Request Requirements

All endpoints expect:
1. **Route Parameter**: `spaceId` in the URL path
2. **Query Parameter**: `token` with a valid 20-character token ID

Example request:
```
GET /api/v1/spaces/my-space-id/contents/abc123?token=12345678901234567890
```

## Token Permissions

Token permissions are stored in Firestore and can be:
- **V1 Tokens** (legacy): Automatically have `PUBLIC` and `DRAFT` permissions
- **V2 Tokens**: Have explicit permission arrays defined in the token document

```typescript
interface TokenV2 {
  version: 2;
  name: string;
  permissions: TokenPermission[];  // ['PUBLIC', 'DRAFT', 'DEV_TOOLS']
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```
