# Scrapifie - Multi-stage Dockerfile
# Enterprise-grade web scraping platform

# ==============================================================================
# Stage 1: Dependencies
# ==============================================================================
FROM node:20-slim AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# ==============================================================================
# Stage 2: Builder
# ==============================================================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# ==============================================================================
# Stage 3: Production - API Server
# ==============================================================================
FROM node:20-slim AS api

# Install Playwright dependencies for browser engine
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r scrapifie && useradd -r -g scrapifie scrapifie

WORKDIR /app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Install Playwright browsers
RUN npx playwright install chromium --with-deps

# Change ownership
RUN chown -R scrapifie:scrapifie /app

# Switch to non-root user
USER scrapifie

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start API server
CMD ["node", "dist/index.js"]

# ==============================================================================
# Stage 4: Production - Worker
# ==============================================================================
FROM node:20-slim AS worker

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    fonts-liberation \
    fonts-noto-color-emoji \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r scrapifie && useradd -r -g scrapifie scrapifie

WORKDIR /app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Install Playwright browsers
RUN npx playwright install chromium --with-deps

# Create browser data directory
RUN mkdir -p /app/.cache && chown -R scrapifie:scrapifie /app

# Switch to non-root user
USER scrapifie

# Environment variables
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright

# Health check (workers don't have HTTP, check process)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "process.exit(0)"

# Start worker
CMD ["node", "dist/workers/index.js"]

# ==============================================================================
# Stage 5: Development
# ==============================================================================
FROM node:20-slim AS development

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    fonts-liberation \
    fonts-noto-color-emoji \
    git \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Install Playwright browsers
RUN npx playwright install chromium --with-deps

# Copy source code
COPY . .

# Environment variables
ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000

# Start in development mode
CMD ["npm", "run", "dev"]
