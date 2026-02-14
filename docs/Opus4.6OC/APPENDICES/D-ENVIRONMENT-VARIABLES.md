Document every environment variable used by the Scrapifie platform. For each variable:
- Variable name
- Required or optional
- Type (string, integer, boolean, URL, etc.)
- Default value (if any)
- Description
- Example value
- Which service/component uses it
- Security sensitivity level (public, private, secret)
Categories to cover:
- Server (PORT, HOST, NODE_ENV, LOG_LEVEL, etc.)
- Database (DATABASE_URL, DB_POOL_MIN, DB_POOL_MAX, DB_SSL, etc.)
- Redis (REDIS_URL, REDIS_PASSWORD, REDIS_TLS, etc.)
- Authentication (SESSION_SECRET, BCRYPT_ROUNDS, SESSION_IDLE_TIMEOUT, SESSION_ABSOLUTE_TIMEOUT, etc.)
- OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI)
- Email (EMAIL_PROVIDER, EMAIL_API_KEY, EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME, EMAIL_REPLY_TO, etc.)
- Payment (PAYMENT_PROVIDER, PAYMENT_API_KEY, PAYMENT_WEBHOOK_SECRET, etc.)
- Proxy Providers (BRIGHTDATA_*, OXYLABS_, SMARTPROXY_, etc.)
- Scraping Engine (CAMOUFOX_URL, DEFAULT_TIMEOUT, MAX_CONCURRENT_JOBS, etc.)
- Storage (STORAGE_PROVIDER, STORAGE_BUCKET, STORAGE_REGION, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY)
- Application (APP_URL, API_URL, CORS_ORIGINS, etc.)
- Rate Limiting (various rate limit configs)
- Feature Flags (REGISTRATION_ENABLED, MAINTENANCE_MODE, etc.)
- Monitoring (SENTRY_DSN or equivalent, LOG_AGGREGATION_URL, etc.)
- Encryption (ENCRYPTION_KEY for application-level AES-256-GCM encryption of sensitive fields)
Follow the same appendix format. Reference the existing .env.example file for the engine-specific variables already in use. The existing .env.example has variables for the scraping engine backend (Phases 1-5) — the new file should include ALL of those PLUS all new variables needed for the full platform (Phases 6-12).2