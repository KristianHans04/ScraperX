# Installation

This guide covers how to install and set up Scrapifie on your local machine.

## Prerequisites

Before installing Scrapifie, ensure you have:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 18+ | Runtime environment |
| PostgreSQL | 14+ | Primary database |
| Redis | 7+ | Queue and caching |
| Docker | 20+ | Container runtime (recommended) |

## Installation Methods

### Method 1: Docker (Recommended)

The easiest way to run Scrapifie is with Docker Compose, which handles all dependencies automatically.

1. Clone the repository
2. Copy the environment file:
   ```
   cp .env.example .env
   ```
3. Start all services:
   ```
   docker-compose up -d
   ```

This starts:
- PostgreSQL database
- Redis server
- Scrapifie API server
- Scrapifie worker processes
- Camoufox stealth browser service

### Method 2: Manual Installation

For development or custom deployments:

1. **Install dependencies**
   ```
   npm install
   ```

2. **Set up PostgreSQL**
   - Create a database named `scrapifie`
   - Note the connection string

3. **Set up Redis**
   - Start Redis server on default port (6379)

4. **Configure environment**
   - Copy `.env.example` to `.env`
   - Update database and Redis connection strings
   - See [Configuration](configuration.md) for all options

5. **Run database migrations**
   ```
   npm run migrate
   ```

6. **Seed initial data** (optional)
   ```
   npm run seed
   ```

7. **Build the project**
   ```
   npm run build
   ```

8. **Start the API server**
   ```
   npm run start:api
   ```

9. **Start workers** (in separate terminal)
   ```
   npm run start:worker
   ```

## Verifying Installation

After starting Scrapifie, verify it's running:

1. Check the health endpoint:
   ```
   curl http://localhost:3000/health
   ```

2. Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2024-01-31T12:00:00.000Z"
   }
   ```

## Next Steps

- [Configure your environment](configuration.md)
- [Make your first scrape request](quick-start.md)
