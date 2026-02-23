# Contributing

Guidelines for contributing to Scrapifie development.

## Technology Stack

Understanding the actual stack before writing code avoids surprises.

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Node.js 20+ with TypeScript | Strict mode, ESM modules |
| API Framework | Express | Dashboard and admin routes |
| Scraping API | Fastify | High-throughput scraping endpoints |
| Database | PostgreSQL | Repositories in `src/db/repositories/` |
| Cache and Queue | Redis + BullMQ | Three named queues: http, browser, stealth |
| Object Storage | MinIO (S3-compatible) | Stores scraped content and screenshots |
| Frontend | React + Vite | Source in `src/frontend/` |
| Test Runner | Vitest | 53 test files, 1,448 tests as of current baseline |

## Getting Started

### Prerequisites

- Node.js 20 or higher
- Docker and Docker Compose
- Git
- A running PostgreSQL instance (or use the Docker Compose setup)
- A running Redis instance (or use the Docker Compose setup)
- MailDev for local email development (optional but recommended)

### Setup Development Environment

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/your-org/scrapifie.git
   cd scrapifie
   npm install
   ```

2. Start the infrastructure services. The Docker Compose file brings up PostgreSQL, Redis, MinIO, and MailDev:
   ```bash
   docker-compose up -d postgres redis minio maildev
   ```

3. Configure the environment. Copy the example file and fill in the values for your local setup. The minimum required variables for local development are `DATABASE_URL`, `REDIS_URL`, `SMTP_HOST`, and `SMTP_PORT`:
   ```bash
   cp .env.example .env
   ```

4. Run the database migrations to create all tables:
   ```bash
   npm run migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

MailDev's web UI is available at `http://localhost:1080` and captures all outgoing emails so you can verify transactional email templates during development without sending real messages.

## Source Directory Layout

```
src/
├── api/
│   ├── middleware/     # Auth, CSRF, rate limiting, input validation, security headers
│   ├── routes/         # Express route handlers (dashboard, admin)
│   └── schemas/        # Zod validation schemas
├── config/
│   └── index.ts        # Centralised configuration parsed from environment variables
├── db/
│   ├── migrations/     # Sequential SQL migration files
│   └── repositories/   # One repository class per database table
├── engines/
│   ├── http/           # impit-based static HTTP engine
│   ├── browser/        # Playwright Chromium engine
│   ├── stealth/        # Camoufox stealth engine
│   └── selector.ts     # Engine selection and auto-escalation logic
├── fingerprint/        # Browser fingerprint generation for evasion
├── frontend/           # React + Vite frontend application
├── proxy/              # Proxy manager and rotation logic
├── queue/              # BullMQ queue definitions and Redis client
├── services/           # Business logic layer (email, billing, subscriptions, etc.)
├── types/              # Shared TypeScript type definitions
├── utils/              # Shared utilities (crypto, logger, errors)
└── workers/            # BullMQ job processors (http, browser, stealth workers)
```

The `tests/` directory mirrors `src/` and contains unit tests, with integration tests under `tests/integration/`.

## Development Workflow

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/description` | `feature/add-pdf-export` |
| Bug fix | `fix/description` | `fix/rate-limit-bypass` |
| Refactor | `refactor/description` | `refactor/queue-logic` |
| Documentation | `docs/description` | `docs/api-reference` |

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Examples:
```
feat(api): add PDF export endpoint
fix(queue): prevent duplicate job processing
docs(api): update rate limiting documentation
```

### Pull Request Process

1. Create a feature branch from `main`.
2. Make your changes.
3. Write or update tests — all new features require tests; bug fixes require regression tests.
4. Ensure all tests pass locally before pushing.
5. Update the relevant documentation if the change affects behaviour or configuration.
6. Submit the pull request and address review feedback.

## Code Standards

### TypeScript

Use strict TypeScript throughout. Avoid `any` — use `unknown` and narrow with type guards. Define explicit interfaces for object shapes rather than relying on inference for public APIs. Export types from the module where they are defined.

### Naming Conventions

| Entity | Convention | Example |
|------|------------|---------|
| Source files | camelCase | `scrapeJob.ts`, `email.service.ts` |
| Classes | PascalCase | `BrowserWorker`, `InvoiceService` |
| Functions and methods | camelCase | `processJob`, `allocateCredits` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `CSRF_TOKEN_LENGTH` |
| Interfaces and types | PascalCase | `ScrapeOptions`, `EngineType` |

No file should exceed 1,000 lines. If a file is growing beyond that, split it into focused modules.

### Input Validation

All user-supplied input must be validated with a Zod schema at the route level. Database operations use parameterised queries exclusively — never interpolate user data into SQL strings. The `inputValidation` middleware provides a second-pass pattern scan; do not rely on it as the primary defence.

### Error Handling

Use the typed error classes in `src/utils/errors.ts` for all application errors. These carry HTTP status codes, machine-readable error codes, and a retryable flag that the client can use to decide whether to retry. Do not throw plain `Error` objects from business logic.

## Testing

### Running Tests

```bash
# Run all unit tests
npm test

# Run with coverage report
npm run test:coverage

# Run a specific test file
npm test -- tests/unit/services/email.service.test.ts

# Run frontend tests
npm run test:frontend
```

The test suite uses Vitest. The current baseline is 53 test files and 1,448 tests. All tests must pass before a pull request can be merged.

### Test Guidelines

- Follow the Arrange-Act-Assert pattern.
- Use descriptive test names that describe the behaviour, not the implementation.
- Mock all external dependencies (database, Redis, payment provider, email transport) using Vitest's mocking utilities.
- Test both the success path and all relevant error paths, especially for security-sensitive code.
- Use `tests/fixtures/` for shared test data to keep test files concise.

### Test Environment

The test setup in `tests/setup.ts` configures the test environment. Tests run with `NODE_ENV=test`. Database calls are mocked at the repository layer to avoid requiring a live database for unit tests. Integration tests in `tests/integration/` require the full Docker Compose stack to be running.

## Security Guidelines

- Never commit secrets, API keys, or credentials to version control.
- Do not log sensitive values such as API keys, session tokens, or payment information. Log only identifiers.
- When adding a new route that handles user data, apply the `requireAuth` or `requireApiKey` middleware and register the route under the appropriate path prefix.
- New admin routes must also apply `requireAdmin` and `adminSelfProtection`.
- All state-changing dashboard routes are automatically covered by the CSRF middleware; do not exempt them unless there is a specific and documented reason.

## Review Checklist

Before submitting a pull request:

- [ ] All tests pass locally with `npm test`
- [ ] New tests cover the changed behaviour
- [ ] TypeScript compiles without errors
- [ ] No `console.log` or debug output left in code
- [ ] No sensitive data is logged or exposed
- [ ] Input validation is applied at the route level
- [ ] Error handling uses typed error classes
- [ ] Documentation is updated if behaviour changed

## Getting Help

Check existing issues and pull request discussions before opening a new issue. For questions during active development, add a comment to the relevant pull request.

## License

By contributing, you agree that your contributions will be licensed under the project's license.
