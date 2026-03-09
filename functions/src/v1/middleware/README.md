# Authentication Middleware

This middleware provides token-based authentication and role-based authorization for V1 API endpoints.

## Features

- Validates token format and existence
- Fetches token data from Firestore
- Checks token permissions against required roles
- Attaches token information to the request object
- Provides clear error messages for authentication failures

## Usage

### Basic Usage

```typescript
import { Router } from 'express';
import { TokenPermission } from '../models';
import { requireTokenPermissions, RequestWithToken } from './middleware';

const router = Router();

// Require a single permission
router.get(
  '/api/v1/spaces/:spaceId/content',
  requireTokenPermissions([TokenPermission.PUBLIC]),
  async (req: RequestWithToken, res) => {
    // Access validated token
    const token = req.token;
    const tokenId = req.tokenId;
    
    // Your route logic here
  }
);

// Require multiple permissions (token must have at least one)
router.post(
  '/api/v1/spaces/:spaceId/content',
  requireTokenPermissions([TokenPermission.DRAFT, TokenPermission.DEV_TOOLS]),
  async (req: RequestWithToken, res) => {
    // Only tokens with DRAFT or DEV_TOOLS permission can access this
  }
);
```

### Using the Helper Function

For single permission checks, you can use the convenience function:

```typescript
import { requireTokenPermission } from './middleware';

router.get(
  '/api/v1/spaces/:spaceId/dev-tools',
  requireTokenPermission(TokenPermission.DEV_TOOLS),
  async (req: RequestWithToken, res) => {
    // Only tokens with DEV_TOOLS permission
  }
);
```

## Request Requirements

The middleware expects:
1. **spaceId** in route parameters: `/api/v1/spaces/:spaceId/...`
2. **token** in query parameters: `?token=your-token-here`

Example request:
```
POST /api/v1/spaces/my-space-id/content?token=abc123xyz456
```

## Response Codes

- **401 Unauthorized**: Invalid token format, token not found
- **403 Forbidden**: Token exists but lacks required permissions
- **400 Bad Request**: Missing required spaceId parameter
- **500 Internal Server Error**: Error during token verification

## Token Permissions

Available permissions (from `TokenPermission` enum):
- `PUBLIC` - Read-only access to public content
- `DRAFT` - Access to draft content
- `DEV_TOOLS` - Access to development tools

## Extended Request Type

When using the middleware, type your request handler with `RequestWithToken` to access:

```typescript
interface RequestWithToken extends Request {
  token?: Token;      // The full token object from Firestore
  tokenId?: string;   // The token ID string
}
```

## Example Integration

```typescript
import { Router } from 'express';
import { TokenPermission } from '../models';
import { requireTokenPermissions, RequestWithToken } from './middleware';

export const API = Router();

// Public content - requires PUBLIC permission
API.get(
  '/api/v1/spaces/:spaceId/content/:contentId',
  requireTokenPermissions([TokenPermission.PUBLIC]),
  async (req: RequestWithToken, res) => {
    const { spaceId, contentId } = req.params;
    // Fetch and return content
  }
);

// Draft content - requires DRAFT or DEV_TOOLS permission
API.get(
  '/api/v1/spaces/:spaceId/drafts/:draftId',
  requireTokenPermissions([TokenPermission.DRAFT, TokenPermission.DEV_TOOLS]),
  async (req: RequestWithToken, res) => {
    const { spaceId, draftId } = req.params;
    // Fetch and return draft content
  }
);

// Admin operations - requires DEV_TOOLS permission
API.post(
  '/api/v1/spaces/:spaceId/settings',
  requireTokenPermission(TokenPermission.DEV_TOOLS),
  async (req: RequestWithToken, res) => {
    const { spaceId } = req.params;
    // Update space settings
  }
);
```
