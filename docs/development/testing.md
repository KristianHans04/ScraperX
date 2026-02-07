# Testing

ScraperX has a comprehensive test suite using Vitest. This document covers running and writing tests.

## Test Suite Overview

| Category | Tests | Coverage |
|----------|-------|----------|
| Unit Tests | ~380 | All modules |
| Integration Tests | ~30 | API, workflows |
| **Total** | **~413** | **All passing** |

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Specific Test File

```bash
npm test -- tests/unit/utils/crypto.test.ts
```

### Run Tests by Pattern

```bash
npm test -- --grep "auth"
```

### Run with Coverage

```bash
npm run test:coverage
```

## Test Structure

```
tests/
├── fixtures/           # Mock data and factories
│   └── index.ts
├── integration/        # End-to-end tests
│   ├── api.test.ts
│   └── scrape.test.ts
├── unit/               # Unit tests
│   ├── api/
│   │   ├── auth.test.ts
│   │   ├── rateLimit.test.ts
│   │   └── schemas.test.ts
│   ├── engines/
│   │   ├── browser.test.ts
│   │   ├── http.test.ts
│   │   └── selector.test.ts
│   ├── fingerprint/
│   │   ├── generator.test.ts
│   │   └── injector.test.ts
│   ├── proxy/
│   │   └── manager.test.ts
│   ├── queue/
│   │   ├── queues.test.ts
│   │   └── redis.test.ts
│   ├── utils/
│   │   ├── credits.test.ts
│   │   ├── crypto.test.ts
│   │   └── errors.test.ts
│   └── workers/
│       └── http.worker.test.ts
└── setup.ts            # Global test setup
```

## Test Configuration

Tests are configured in `vitest.config.ts`:

- Uses the setup file for global mocks
- Runs in Node environment
- Includes coverage reporting
- Supports TypeScript paths

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Module Name', () => {
  describe('functionName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = functionName(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Using Fixtures

```typescript
import { createMockOrganization, createMockJob } from '../../fixtures';

it('should process job', async () => {
  const org = createMockOrganization();
  const job = createMockJob({ organizationId: org.id });
  
  const result = await processJob(job);
  
  expect(result.status).toBe('completed');
});
```

### Mocking Dependencies

```typescript
import { vi } from 'vitest';

// Mock module
vi.mock('../../src/db/connection', () => ({
  pool: {
    query: vi.fn()
  }
}));

// Mock implementation
import { pool } from '../../src/db/connection';

it('should query database', async () => {
  vi.mocked(pool.query).mockResolvedValue({
    rows: [{ id: '123' }]
  });
  
  const result = await findById('123');
  
  expect(pool.query).toHaveBeenCalledWith(
    expect.stringContaining('SELECT'),
    ['123']
  );
});
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  const promise = asyncFunction();
  
  await expect(promise).resolves.toBe('success');
});

it('should handle errors', async () => {
  const promise = failingFunction();
  
  await expect(promise).rejects.toThrow('Expected error');
});
```

## Test Fixtures

The fixtures file provides factory functions:

### Available Factories

| Factory | Returns |
|---------|---------|
| `createMockOrganization()` | Organization object |
| `createMockApiKey()` | API key object |
| `createMockJob()` | Scrape job object |
| `createMockResult()` | Job result object |
| `createMockRequest()` | HTTP request object |

### Customizing Fixtures

```typescript
const org = createMockOrganization({
  credits: 500,
  tier: 'enterprise'
});
```

## Integration Tests

Integration tests verify complete workflows:

### API Integration Test

```typescript
describe('API Integration', () => {
  it('should create and complete a scrape job', async () => {
    // Create job via API
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/scrape',
      headers: { 'X-API-Key': testApiKey },
      payload: { url: 'https://example.com' }
    });
    
    expect(response.statusCode).toBe(200);
    expect(response.json().jobId).toBeDefined();
  });
});
```

## Mocking External Services

### Database

Database is mocked in `tests/setup.ts` to avoid requiring PostgreSQL during tests.

### Redis

Redis operations are mocked to work without a Redis server.

### HTTP Requests

External HTTP requests use `msw` or manual mocks:

```typescript
vi.mock('undici', () => ({
  fetch: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve('<html>...</html>')
  })
}));
```

## Best Practices

1. **Isolate tests** - Each test should be independent
2. **Use descriptive names** - Describe what the test verifies
3. **Follow AAA pattern** - Arrange, Act, Assert
4. **Mock external dependencies** - Don't rely on external services
5. **Test edge cases** - Include error conditions
6. **Keep tests fast** - Unit tests should run in milliseconds
7. **Avoid test interdependence** - No shared mutable state

## Debugging Tests

### Run Single Test

```bash
npm test -- --run tests/unit/specific.test.ts
```

### Verbose Output

```bash
npm test -- --reporter=verbose
```

### Debug Mode

Add `debugger` statements and run:

```bash
node --inspect-brk node_modules/.bin/vitest run
```
