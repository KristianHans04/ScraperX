# Testing

## Overview

Scrapifie has a comprehensive automated test suite built on Vitest. All 1448 tests across 53 test files pass on a clean checkout. Tests run without a live database or Redis connection because all external infrastructure is mocked globally.

---

## Running Tests

All test commands are available through npm scripts.

To run the full suite once: `npm test`

To run in watch mode during active development: `npm run test:watch`

To generate a coverage report: `npm run test:coverage`

To run a single file, pass its path after a double-dash separator: `npm test -- tests/unit/utils/crypto.test.ts`

To run tests matching a name pattern: `npm test -- --reporter=verbose`

---

## Test Configuration

Tests are configured in `vitest.config.ts`. Key settings:

- Environment: Node (no browser environment for backend tests; a separate frontend config exists at `vitest.frontend.config.ts`)
- Setup file: `tests/setup.ts` runs before every test file
- Timeout: 30 seconds per test and hook
- Coverage: V8 provider covering `src/**/*.ts`, excluding `src/types/`, `src/index.ts`, and `src/frontend/`
- Path aliases: The `@`, `@api`, `@db`, `@engines`, `@queue`, `@workers`, `@utils`, and `@types` aliases resolve to the corresponding `src/` subdirectories
- Custom plugin: A `jsToTsPlugin` resolves `.js` extension imports to their `.ts` equivalents. This is necessary because the TypeScript source uses ESM-style `.js` imports for runtime compatibility but the actual files on disk have `.ts` extensions.

---

## Test Structure

```
tests/
├── fixtures/
│   ├── index.ts              Main fixture data and factory functions
│   └── admin.fixtures.ts     Admin-specific fixture data
├── integration/
│   ├── api.test.ts           Full Express application integration tests using supertest
│   └── scrape.test.ts        End-to-end scrape workflow tests
├── unit/
│   ├── api/
│   │   ├── middleware/       One test file per middleware module
│   │   │   ├── auth.test.ts
│   │   │   ├── csrf.test.ts
│   │   │   ├── rateLimit.test.ts
│   │   │   ├── inputValidation.test.ts
│   │   │   ├── adminSelfProtection.test.ts
│   │   │   ├── requireAdmin.test.ts
│   │   │   ├── security.test.ts
│   │   │   └── securityHeaders.test.ts
│   │   ├── routes/
│   │   │   ├── admin/        Admin route tests
│   │   │   ├── public/       Public route tests
│   │   │   ├── auth.routes.test.ts
│   │   │   ├── dashboard.routes.test.ts
│   │   │   ├── jobs.routes.test.ts
│   │   │   ├── keys.routes.test.ts
│   │   │   └── usage.routes.test.ts
│   │   └── schemas.test.ts
│   ├── db/
│   │   └── repositories/     One test file per repository
│   ├── engines/              HTTP, browser, and selector engine tests
│   ├── fingerprint/          Generator and injector tests
│   ├── frontend/             Frontend utility tests
│   ├── proxy/                Proxy manager tests
│   ├── queue/                Queue and Redis client tests
│   ├── services/             One test file per service
│   ├── utils/                Utility function tests
│   └── workers/              Worker tests
└── setup.ts                  Global environment setup and mock declarations
```

---

## Global Test Setup

`tests/setup.ts` runs before every test file and performs three things.

First, it sets process environment variables (NODE_ENV, DATABASE_URL, REDIS_URL, LOG_LEVEL, and Paystack config) before any application module is imported. This is important because several modules read configuration at import time.

Second, it globally mocks three infrastructure dependencies that would require live services:

- `pino` is replaced with a mock logger whose methods (`info`, `warn`, `error`, etc.) are all `vi.fn()` stubs. The mock also exposes `stdTimeFunctions` and other pino properties that are accessed at module load time in `src/utils/logger.ts`.
- `pg` Pool is replaced with a mock that resolves all queries to `{ rows: [], rowCount: 0 }`. Individual tests override this per-test using `vi.mocked(pool.query).mockResolvedValue(...)`.
- `ioredis` is replaced with a mock Redis client whose common commands (`get`, `set`, `del`, `expire`, `zadd`, etc.) are all stubs.

Third, a `beforeEach` hook calls `vi.clearAllMocks()` before every test. This clears call counts and captured arguments from the previous test without resetting the mock implementations set up in the `vi.mock` factories.

---

## Test Fixtures

`tests/fixtures/index.ts` exports typed constant objects and factory-style building blocks for the most common domain entities. Available fixtures include pre-built mock objects for accounts (free, pro, and enterprise tiers), users, API keys, scrape jobs, job results, sessions, and organizations.

`tests/fixtures/admin.fixtures.ts` exports fixtures specific to admin-level test scenarios.

Fixtures use fixed UUIDs so that tests that cross-reference related entities remain deterministic. When a test needs a variant of a base fixture, use object spread to override only the relevant fields rather than duplicating the entire object.

---

## Test Philosophy

The suite is organized into three levels of scope:

Unit tests cover a single module in isolation. All external dependencies (repositories, services, other utilities) are mocked. The test asserts on return values, thrown errors, and mock call arguments. Unit tests should run in milliseconds and have no side effects.

Integration tests cover one or more modules working together. The Express application is mounted using supertest and real route handlers execute, but the database and Redis remain mocked. Integration tests verify that middleware, route handlers, and validators compose correctly without testing individual module internals.

End-to-end scrape workflow tests in `tests/integration/scrape.test.ts` verify that the job lifecycle — submission, engine selection, credit deduction, result storage — behaves correctly with all modules in play.

---

## Writing New Tests

Place unit tests in a directory structure that mirrors the source tree. A test for `src/services/email.service.ts` belongs at `tests/unit/services/email.service.test.ts`.

Use `describe` blocks to group related tests by the name of the module or function under test. Use nested `describe` blocks for individual method names when a single function has many independent cases. Use `it` (or `test`) with a description that completes the sentence "it should …".

Follow the Arrange-Act-Assert pattern: set up preconditions, call the function under test, then assert on the outcome. Avoid mixing setup and assertion in the same line where possible.

Each test must be independent. Tests must not share mutable state, must not depend on execution order, and must not leave side effects that could affect a later test. The `vi.clearAllMocks()` call in `beforeEach` handles mock state, but any other shared state must be reset explicitly.

---

## Mocking Patterns

For module-level mocks that apply to every test in a file, use `vi.mock('module-path')` at the top level of the test file. The mock factory is hoisted before any imports, so it executes before the module under test is loaded. When the mock factory needs to reference variables defined in the test file, wrap those variables with `vi.hoisted()` so they are also hoisted.

For per-test mock overrides, use `vi.mocked(dependency.method).mockResolvedValue(value)` inside the individual `it` block. This sets the return value for that test only; `vi.clearAllMocks()` ensures the override does not leak into the next test.

When testing modules that import from files with `.js` extensions (common throughout the source because of ESM imports), no special handling is needed — the `jsToTsPlugin` in `vitest.config.ts` resolves these automatically.

---

## Mocking the Database

The global `pg` Pool mock returns empty result sets by default. To simulate a query returning data, call `vi.mocked(pool.query).mockResolvedValueOnce({ rows: [yourRow], rowCount: 1 })` inside the test. The `Once` variant ensures the override applies only to the next call and reverts to the default empty result thereafter.

For repository tests, import the repository under test and the pool, mock the pool at the top of the file, and then assert that the repository calls the pool with the correct SQL and parameters.

---

## Testing Express Routes

Route tests use supertest to send real HTTP requests through the full Express middleware stack. The application instance is created by calling `createServer()` from `src/api/server.ts`, then wrapping it with `supertest`.

For routes that require authentication, the session cookie and CSRF token must be included in the request. The standard approach is to perform a login request within the test setup, capture the Set-Cookie headers from the response, and forward them on subsequent requests. The integration test file at `tests/integration/api.test.ts` shows the established pattern for this.

For routes that require an API key, set the `X-API-Key` header to a value that the mocked `apiKeyRepository.findByKeyHash` will return a valid key object for.

---

## Debugging Test Failures

To run a single test file with full output: `npm test -- --reporter=verbose tests/unit/services/email.service.test.ts`

To run only tests matching a pattern within a file: `npm test -- --reporter=verbose -t "should send verification email"`

To attach a debugger, run `node --inspect-brk node_modules/.bin/vitest run` and connect with a Node.js debugger. The `debugger` statement can be inserted anywhere in the test or application code.

For failures caused by unexpected mock behaviour, add a temporary `console.log(vi.mocked(dependency.method).mock.calls)` to inspect what arguments the mock received. Remove these before committing.

When a test passes in isolation but fails when the full suite runs, the likely cause is shared mutable state or a mock that was not cleared. Check that `vi.clearAllMocks()` is running (it is, via `beforeEach` in `tests/setup.ts`) and that no module-level variable is being mutated between tests.
