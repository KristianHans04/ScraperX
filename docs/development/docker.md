# Docker Setup

Scrapifie uses Docker for easy deployment and development. This document covers Docker configuration and usage.

## Overview

Docker Compose orchestrates all services:

| Service | Image | Purpose |
|---------|-------|---------|
| postgres | postgres:16-alpine | Primary database |
| redis | redis:7-alpine | Queue and caching |
| api | scrapifie:latest | Fastify API server |
| worker | scrapifie:latest | Job processing |
| camoufox | scrapifie-camoufox | Stealth browser |

## Quick Start

### Start All Services

```bash
docker-compose up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
```

### Stop Services

```bash
docker-compose down
```

### Rebuild After Changes

```bash
docker-compose up -d --build
```

## Docker Compose Configuration

### Services

#### PostgreSQL

```yaml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_DB: scrapifie
    POSTGRES_USER: scrapifie
    POSTGRES_PASSWORD: scrapifie
  volumes:
    - postgres_data:/var/lib/postgresql/data
  ports:
    - "5432:5432"
```

#### Redis

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes
  volumes:
    - redis_data:/data
  ports:
    - "6379:6379"
```

#### API Server

```yaml
api:
  build:
    context: .
    target: api
  environment:
    - NODE_ENV=production
    - DATABASE_URL=postgresql://scrapifie:scrapifie@postgres:5432/scrapifie
    - REDIS_URL=redis://redis:6379
  ports:
    - "3000:3000"
  depends_on:
    - postgres
    - redis
```

#### Worker

```yaml
worker:
  build:
    context: .
    target: worker
  environment:
    - NODE_ENV=production
    - DATABASE_URL=postgresql://scrapifie:scrapifie@postgres:5432/scrapifie
    - REDIS_URL=redis://redis:6379
  depends_on:
    - postgres
    - redis
    - camoufox
```

#### Camoufox (Stealth Browser)

```yaml
camoufox:
  build:
    context: ./docker/camoufox
  ports:
    - "8000:8000"
```

## Dockerfile

Scrapifie uses a multi-stage Dockerfile:

### Build Stage

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

### API Stage

```dockerfile
FROM node:20-alpine AS api
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/api/index.js"]
```

### Worker Stage

```dockerfile
FROM node:20-alpine AS worker
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
# Install Playwright browsers
RUN npx playwright install chromium --with-deps
CMD ["node", "dist/workers/index.js"]
```

## Development with Docker

### Development Mode

For development with hot reloading:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

This mounts source code as volumes for live changes.

### Running Tests in Docker

```bash
docker-compose run --rm api npm test
```

### Database Migrations

```bash
docker-compose exec api npm run migrate
```

### Database Seeding

```bash
docker-compose exec api npm run seed
```

## Environment Variables

Pass environment variables via `.env` file:

```bash
# Create .env from example
cp .env.example .env

# Edit values
nano .env

# Docker Compose automatically loads .env
docker-compose up -d
```

## Volumes

Persistent data is stored in Docker volumes:

| Volume | Service | Purpose |
|--------|---------|---------|
| postgres_data | postgres | Database files |
| redis_data | redis | Queue persistence |

### Viewing Volumes

```bash
docker volume ls | grep scrapifie
```

### Removing Volumes (CAUTION: Deletes data)

```bash
docker-compose down -v
```

## Scaling

### Scale Workers

Run multiple worker containers:

```bash
docker-compose up -d --scale worker=3
```

### Check Running Containers

```bash
docker-compose ps
```

## Networking

All services share a Docker network:

- Services communicate by name (e.g., `redis://redis:6379`)
- Only exposed ports are accessible from host
- Default network is bridge mode

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs api

# Check container status
docker-compose ps

# Inspect container
docker inspect scrapifie_api_1
```

### Database Connection Issues

```bash
# Verify postgres is running
docker-compose ps postgres

# Connect to postgres
docker-compose exec postgres psql -U scrapifie -d scrapifie
```

### Redis Connection Issues

```bash
# Check redis
docker-compose exec redis redis-cli ping
```

### Rebuild Everything

```bash
# Stop and remove everything
docker-compose down -v --rmi all

# Rebuild from scratch
docker-compose up -d --build
```

## Resource Limits

For production, set resource limits:

```yaml
worker:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 4G
      reservations:
        cpus: '0.5'
        memory: 1G
```

## Health Checks

Services include health checks:

```yaml
api:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

Check health status:

```bash
docker-compose ps
```
