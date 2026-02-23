# Testing Guide

This guide is intended for developers actively writing or modifying tests in the Scrapifie codebase. It covers the practical mechanics of the test setup, common patterns, and how to debug failures. For a high-level overview of the test suite structure and philosophy, see `docs/development/testing.md`.

---

## How the Test Environment Works

When Vitest runs, it executes `tests/setup.ts` before any test file is loaded. That file mocks three infrastructure dependencies — `pino`, `pg`, and `ioredis` — so tests never require a live database, Redis server, or log output. It also calls `vi.clearAllMocks()` in a `beforeEach` hook, which resets call counts and captured arguments between tests without resetting the mock implementations themselves.

The `vitest.config.ts` includes a custom `jsToTsPlugin` that intercepts any import ending in `.js` and, if a `.ts` file with the same base name exists on disk, resolves it to that TypeScript file. This is needed because the source uses ESM `.js` import extensions for runtime compatibility, while Vitest reads the `.ts` source directly.

Path aliases (`@`, `@api`, `@db`, etc.) are configured in `vitest.config.ts` and mirror the `tsconfig.json` aliases. Use them in test files the same way you would in source files.

---

## Writing Route Tests with Supertest

Route tests send real HTTP requests through the full Express middleware stack. Import `createServer` from `src/api/server.ts` and wrap it with supertest's `request` function.

The test makes a real request — headers, cookies, middleware, route handler, and response all behave as they would in a running server. The database remains mocked via the global `pg` mock from `tests/setup.ts`.

For a route that requires session authentication, you need a valid session cookie and CSRF token. The established pattern is to call the login endpoint first, extract the `Set-Cookie` header from the response, and forward it on subsequent requests. The `x-csrf-token` request header must also be set to the value of the `csrf_token` cookie. Look at `tests/integration/api.test.ts` for a concrete example of this login-then-request pattern.

For routes that require API key authentication, set the `x-api-key` header. Because the database is mocked, you also need to configure the mock for `apiKeyRepository.findByKeyHash` (or whichever repository method the middleware uses) to return a valid key object for the value you pass. This is typically done with `vi.mocked(apiKeyRepository.findByKeyHash).mockResolvedValue(mockApiKey)` at the start of the test.

For unauthenticated public routes, no additional setup is needed beyond mounting the app.

When asserting on responses, check both the status code and the response body. Checking only the status code often masks incorrect response shapes that would cause runtime problems. Use `expect(response.body).toMatchObject({ field: value })` to assert on a subset of the response without being brittle about fields you do not care about.

---

## Writing Service Tests with Mocks

Service tests isolate one service module and mock all its dependencies. The pattern is always the same: mock the modules that the service imports, import the service, and then assert on its behaviour.

Use `vi.mock('../../src/db/repositories/user.repository.js')` at the top of the test file. Vitest hoists `vi.mock` calls before any imports, so the mock is in place before the service module loads. The auto-mock creates stub functions for all exported members; you then configure individual methods with `vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser)` inside the test.

When a mock needs to throw to simulate an error path, use `mockRejectedValue(new Error('message'))` or `mockRejectedValueOnce(...)` for a single-use error. Test both the happy path and the error path for every service method that can fail.

If a service has module-level initialization (for example, creating an email transport at import time), you may need to mock the dependency before the import is executed. In those cases, `vi.hoisted()` can be used to declare variables before the `vi.mock` factory so the factory can reference them.

---

## How Test Fixtures Work

`tests/fixtures/index.ts` exports constant mock objects representing the core domain entities: `mockAccount`, `mockProAccount`, `mockEnterpriseAccount`, `mockUser`, `mockApiKey`, `mockScrapeJob`, and others. These use fixed UUIDs so tests that join or cross-reference them remain deterministic.

To use a variant of a fixture, spread it and override specific fields. For example, to create a suspended account in a test, write `{ ...mockAccount, status: 'suspended' }` inline. This keeps the fixture file lean while allowing tests to express only what is relevant to the scenario being tested.

For admin-level scenarios, use the fixtures from `tests/fixtures/admin.fixtures.ts`.

If you find yourself creating the same object structure in multiple test files, consider whether it belongs in the fixtures file. Keep fixtures to data shapes; do not put setup logic or mock configuration into the fixtures file.

---

## Running Specific Test Patterns

To run only the tests in one file, pass the path after `--`: `npm test -- tests/unit/services/email.service.test.ts`

To run tests whose name matches a string, use the `-t` flag: `npm test -- -t "register"`

To run tests in watch mode and filter to a specific file while developing, run `npm run test:watch -- tests/unit/services/email.service.test.ts`. Vitest will re-run that file on every save.

To check coverage for a specific area: `npm run test:coverage` generates an HTML report in `coverage/`. Open `coverage/index.html` in a browser to navigate per-file coverage.

---

## Debugging Test Failures

When a test fails, Vitest prints the failing assertion alongside the test name and file path. Before adding debug logging, check the following common causes.

A "Cannot find module" error usually means a path alias or import extension is wrong, or the file being imported has not been created yet.

A "mockReturnValue is not a function" or "is not a mock function" error means the dependency was not mocked. Verify that the `vi.mock('...')` call at the top of the file uses the same import path that the module under test uses, including the `.js` extension if applicable.

A test that fails with "Expected X, received undefined" when the mock should have returned data usually means `mockResolvedValue` was called after the test's subject had already been called, or `mockResolvedValueOnce` was consumed by a previous assertion. Check the order of setup calls.

If a test passes in isolation but fails in the full suite, a previous test left shared state. The global `vi.clearAllMocks()` resets mock call counts but not module-level variables. Check whether any module you are testing or mocking stores state in a closure that persists between tests.

For complex failures, add a temporary `console.log(vi.mocked(dependency.method).mock.calls)` to see exactly what arguments the mock received. Remove these before committing.

To run the test suite with verbose output that shows every individual test result: `npm test -- --reporter=verbose`

To attach a Node.js debugger and step through test execution, run `node --inspect-brk node_modules/.bin/vitest run` and connect a debugger to `localhost:9229`.

---

## Common Patterns Reference

**Asserting a repository was called with specific SQL**: mock the pool, call the function under test, then use `expect(vi.mocked(pool.query)).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [expectedParam])`.

**Testing that a function throws**: use `await expect(fn()).rejects.toThrow('message')` for async functions, or `expect(() => fn()).toThrow('message')` for synchronous ones.

**Testing that an email was sent**: mock `EmailService`, call the service method that triggers email sending, then assert `expect(vi.mocked(emailService.sendVerificationEmail)).toHaveBeenCalledWith(expectedEmail, expectedToken)`.

**Testing middleware in isolation**: create a minimal Express app within the test using `express()`, mount only the middleware under test, and use supertest to send requests. This is the approach used in all files under `tests/unit/api/middleware/`.

**Testing that a route returns 401 for unauthenticated requests**: send the request without a session cookie and assert `expect(response.status).toBe(401)`.
