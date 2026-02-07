# Contributing

Guidelines for contributing to ScraperX development.

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

### Setup Development Environment

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/scraperx.git
   cd scraperx
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start infrastructure**
   ```bash
   docker-compose up -d postgres redis
   ```

4. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Run migrations**
   ```bash
   npm run migrate
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

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

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance

Examples:
```
feat(api): add PDF export endpoint
fix(queue): prevent duplicate job processing
docs(api): update rate limiting documentation
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests
4. Ensure all tests pass
5. Update documentation if needed
6. Submit pull request
7. Address review feedback
8. Merge after approval

## Code Standards

### TypeScript

- Use strict TypeScript configuration
- Define explicit types (avoid `any`)
- Use interfaces for object shapes
- Export types from modules

### Code Style

- Use ESLint configuration provided
- Run `npm run lint` before committing
- Use Prettier for formatting
- Keep functions small and focused

### File Organization

```
src/
├── api/           # API layer
│   ├── middleware/
│   ├── routes/
│   └── schemas/
├── config/        # Configuration
├── db/            # Database layer
│   └── repositories/
├── engines/       # Scraping engines
├── queue/         # Job queue
├── types/         # Type definitions
├── utils/         # Shared utilities
└── workers/       # Job processors
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | camelCase | `scrapeJob.ts` |
| Classes | PascalCase | `ScrapeEngine` |
| Functions | camelCase | `processJob` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |
| Interfaces | PascalCase | `ScrapeOptions` |
| Types | PascalCase | `EngineType` |

## Testing Requirements

### Test Coverage

- All new features must include tests
- Bug fixes should include regression tests
- Maintain >80% code coverage

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- tests/unit/specific.test.ts
```

### Test Guidelines

- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Mock external dependencies
- Test edge cases and errors

## Documentation

### Code Documentation

- Add JSDoc comments to public functions
- Document complex logic inline
- Keep README files updated

### API Documentation

- Update endpoint docs for API changes
- Include request/response examples
- Document error responses

## Security

### Sensitive Data

- Never commit secrets or credentials
- Use environment variables
- Don't log sensitive information

### Input Validation

- Validate all user input with Zod
- Sanitize data before database operations
- Use parameterized queries

### Dependencies

- Review security advisories
- Keep dependencies updated
- Audit with `npm audit`

## Performance

### Guidelines

- Use async/await properly
- Avoid blocking operations
- Pool database connections
- Cache when appropriate

### Profiling

- Test with realistic data volumes
- Profile memory usage
- Monitor query performance

## Review Checklist

Before submitting a PR:

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] New tests added for changes
- [ ] Documentation updated
- [ ] No console.log or debug code
- [ ] No sensitive data exposed
- [ ] Error handling is appropriate
- [ ] TypeScript compiles without errors

## Getting Help

- Check existing issues and discussions
- Ask questions in pull request comments
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the project's license.
