# Scrapifie Documentation

Welcome to the Scrapifie documentation. Scrapifie is an enterprise-grade web scraping platform that provides reliable, scalable data extraction with intelligent anti-detection capabilities.

## What is Scrapifie?

Scrapifie is a complete web scraping solution that handles the complexity of modern web scraping:

- **Multi-Engine Architecture** - Automatically selects the best scraping approach (HTTP, Browser, or Stealth) based on target complexity
- **Anti-Detection** - Built-in fingerprint generation and stealth browsing capabilities
- **Scalable Queue System** - Handles thousands of concurrent scrape jobs with intelligent rate limiting
- **Credit-Based Usage** - Fair usage system with configurable credit costs per engine type
- **Multi-Tenant** - Supports multiple organizations with isolated API keys and quotas

## Documentation Sections

### Getting Started

New to Scrapifie? Start here:

- [Installation](getting-started/installation.md) - Set up Scrapifie on your system
- [Configuration](getting-started/configuration.md) - Configure environment variables
- [Quick Start](getting-started/quick-start.md) - Make your first scrape request

### Architecture

Understand how Scrapifie works:

- [System Overview](architecture/overview.md) - High-level architecture and data flow
- [Scraping Engines](architecture/engines.md) - HTTP, Browser, and Stealth engines explained
- [Queue System](architecture/queue-system.md) - Job processing and rate limiting
- [Database Schema](architecture/database.md) - Data models and relationships

### API Reference

Learn how to use the API:

- [Authentication](api/authentication.md) - API key authentication
- [Endpoints](api/endpoints.md) - Complete API reference
- [Rate Limiting](api/rate-limiting.md) - Understanding rate limits
- [Credits](api/credits.md) - Credit system and costs

### Development

Contributing to Scrapifie:

- [Testing](development/testing.md) - Running and writing tests
- [Docker](development/docker.md) - Container setup and usage
- [Contributing](development/contributing.md) - Development guidelines

### Deployment

Running Scrapifie in production:

- [Production Guide](deployment/production.md) - Production deployment best practices

## Quick Links

| Need to... | Go to... |
|------------|----------|
| Get started quickly | [Quick Start](getting-started/quick-start.md) |
| Understand the API | [Endpoints](api/endpoints.md) |
| Run locally with Docker | [Docker](development/docker.md) |
| Deploy to production | [Production Guide](deployment/production.md) |

## Support

For issues and feature requests, please use the GitHub issue tracker.
