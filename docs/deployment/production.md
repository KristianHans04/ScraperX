# Production Deployment

Guide for deploying ScraperX to production environments.

## Deployment Options

| Option | Complexity | Best For |
|--------|------------|----------|
| Docker Compose | Low | Small deployments |
| Kubernetes | Medium | Scalable deployments |
| Managed Services | Low | Cloud-native deployments |

## Pre-Deployment Checklist

### Security

- [ ] Generate strong JWT_SECRET (min 32 random characters)
- [ ] Generate strong ENCRYPTION_KEY (exactly 32 characters)
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Review and restrict API key scopes
- [ ] Enable rate limiting

### Configuration

- [ ] Set `NODE_ENV=production`
- [ ] Configure production database URL
- [ ] Configure production Redis URL
- [ ] Set appropriate log level
- [ ] Configure monitoring endpoints

### Infrastructure

- [ ] Provision database with backups
- [ ] Provision Redis with persistence
- [ ] Set up load balancer (if scaling API)
- [ ] Configure health check endpoints
- [ ] Set up monitoring and alerting

## Docker Compose Production

### Minimal Production Setup

1. **Create production environment file**

   ```bash
   # .env.production
   NODE_ENV=production
   
   # Strong secrets (generate with: openssl rand -hex 32)
   JWT_SECRET=your-64-char-hex-secret-here
   ENCRYPTION_KEY=your-32-char-key-here
   
   # Database
   DATABASE_URL=postgresql://user:pass@db-host:5432/scraperx
   
   # Redis
   REDIS_URL=redis://:password@redis-host:6379
   
   # API
   PORT=3000
   LOG_LEVEL=info
   ```

2. **Run with production config**

   ```bash
   docker-compose --env-file .env.production up -d
   ```

### Production Docker Compose Overrides

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  api:
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  worker:
    restart: always
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

Run with:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Kubernetes Deployment

### Basic Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scraperx-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: scraperx-api
  template:
    metadata:
      labels:
        app: scraperx-api
    spec:
      containers:
      - name: api
        image: scraperx:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - secretRef:
            name: scraperx-secrets
        resources:
          limits:
            memory: "1Gi"
            cpu: "1"
          requests:
            memory: "512Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Worker Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scraperx-worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: scraperx-worker
  template:
    spec:
      containers:
      - name: worker
        image: scraperx:latest
        command: ["node", "dist/workers/index.js"]
        resources:
          limits:
            memory: "4Gi"
            cpu: "2"
```

## Database Configuration

### PostgreSQL Production Settings

```sql
-- Connection pool sizing
max_connections = 200

-- Memory
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB

-- Write performance
wal_buffers = 16MB
checkpoint_completion_target = 0.9
```

### Backups

Set up automated backups:

```bash
# Daily backup
pg_dump -h localhost -U scraperx scraperx | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Connection Pooling

Consider using PgBouncer for connection pooling:

- Reduces database connection overhead
- Improves performance under load
- Recommended for >10 workers

## Redis Configuration

### Production Settings

```
# redis.conf
maxmemory 2gb
maxmemory-policy volatile-lru
appendonly yes
appendfsync everysec
```

### Redis Cluster

For high availability:

- Minimum 3 Redis nodes
- Use Redis Sentinel or Cluster mode
- Configure automatic failover

## SSL/TLS Configuration

### Using Let's Encrypt with Nginx

```nginx
server {
    listen 443 ssl;
    server_name api.scraperx.com;

    ssl_certificate /etc/letsencrypt/live/api.scraperx.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.scraperx.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring

### Health Endpoints

ScraperX provides health endpoints:

| Endpoint | Purpose |
|----------|---------|
| `/health` | Basic health check |
| `/health/ready` | Readiness check |
| `/health/live` | Liveness check |

### Metrics to Monitor

| Metric | Warning | Critical |
|--------|---------|----------|
| API response time | >500ms | >2s |
| Queue depth | >1000 | >5000 |
| Error rate | >1% | >5% |
| Worker utilization | >80% | >95% |
| Database connections | >80% | >95% |
| Memory usage | >80% | >95% |

### Recommended Tools

- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **AlertManager** - Alerting
- **ELK Stack** - Log aggregation

## Scaling Guidelines

### Horizontal Scaling

| Component | Scale When | How |
|-----------|------------|-----|
| API servers | High request volume | Add replicas behind load balancer |
| Workers | Queue depth increasing | Add worker replicas |
| Redis | Memory pressure | Use Redis Cluster |
| PostgreSQL | Query latency | Add read replicas |

### Vertical Scaling

| Component | Resource | Recommendation |
|-----------|----------|----------------|
| API | CPU | 1-2 cores per instance |
| API | Memory | 512MB-1GB per instance |
| Worker | CPU | 2-4 cores per instance |
| Worker | Memory | 2-4GB per instance |
| Camoufox | Memory | 4-8GB per instance |

## Troubleshooting

### Common Issues

**High queue depth**
- Add more workers
- Check for slow jobs
- Verify database performance

**Memory leaks**
- Restart workers periodically
- Check browser cleanup
- Monitor with profiling tools

**Connection timeouts**
- Check firewall rules
- Verify network connectivity
- Review connection pool settings

### Log Analysis

```bash
# Check API logs
docker-compose logs api | grep ERROR

# Check worker logs
docker-compose logs worker | grep -E "(ERROR|WARN)"
```

## Maintenance

### Regular Tasks

| Task | Frequency |
|------|-----------|
| Database backup verification | Weekly |
| Log rotation | Daily |
| Security updates | Monthly |
| Dependency updates | Monthly |
| Performance review | Monthly |

### Zero-Downtime Updates

1. Build new image
2. Update one worker at a time
3. Verify health checks pass
4. Update API servers behind load balancer
5. Monitor for issues
6. Roll back if needed
