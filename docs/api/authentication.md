# Authentication

Scrapifie uses API keys for authentication. This document explains how authentication works and how to manage API keys.

## Overview

All API requests (except health checks) require authentication via an API key. Keys are scoped to organizations and can have different permission levels.

## API Key Format

API keys follow this format:

```
sx_live_abc123...
```

- `sx_` - Prefix identifying Scrapifie keys
- `live_` or `test_` - Environment indicator
- Remaining characters - Unique identifier

## Using API Keys

### Header Authentication (Recommended)

Include the API key in the `X-API-Key` header:

```bash
curl https://api.scrapifie.com/api/v1/scrape \
  -H "X-API-Key: sx_live_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Bearer Token

Alternatively, use the Authorization header:

```bash
curl https://api.scrapifie.com/api/v1/scrape \
  -H "Authorization: Bearer sx_live_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## Key Scopes

API keys can have different permission scopes:

| Scope | Description |
|-------|-------------|
| `scrape:read` | View job status and results |
| `scrape:write` | Create new scrape jobs |
| `account:read` | View organization info and usage |
| `account:write` | Modify organization settings |

Most keys have `scrape:read` and `scrape:write` scopes.

## Error Responses

### Missing API Key

```json
{
  "error": "Unauthorized",
  "message": "API key is required",
  "statusCode": 401
}
```

### Invalid API Key

```json
{
  "error": "Unauthorized",
  "message": "Invalid API key",
  "statusCode": 401
}
```

### Expired API Key

```json
{
  "error": "Unauthorized",
  "message": "API key has expired",
  "statusCode": 401
}
```

### Insufficient Permissions

```json
{
  "error": "Forbidden",
  "message": "API key lacks required scope: scrape:write",
  "statusCode": 403
}
```

## Key Management

### Creating Keys

API keys are created through:

1. Admin dashboard (if available)
2. Database seeding (for development)
3. Admin API endpoints (for automation)

### Key Security

- Keys are hashed before storage (SHA-256)
- Original key is shown only once at creation
- Keys cannot be retrieved after creation
- Lost keys must be revoked and replaced

### Rotating Keys

To rotate an API key:

1. Create a new key
2. Update your application to use the new key
3. Verify the new key works
4. Revoke the old key

### Key Expiration

Keys can have optional expiration dates:

- Default: No expiration
- Recommended: Rotate every 90 days
- For temporary access: Set specific expiration

## Organization Context

Each API key belongs to an organization:

- All operations are scoped to that organization
- Credit usage is charged to the organization
- Rate limits apply per organization
- Jobs are isolated between organizations

## Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** to store keys
3. **Use separate keys** for development and production
4. **Rotate keys regularly** (every 90 days)
5. **Limit scope** to minimum required permissions
6. **Monitor usage** for unexpected patterns
7. **Revoke unused keys** immediately

## Environment Variables

Store your API key in environment variables:

```bash
# .env file (never commit this!)
SCRAPIFIE_API_KEY=sx_live_your_key_here
```

Usage in code:

```javascript
const apiKey = process.env.SCRAPIFIE_API_KEY;
```
