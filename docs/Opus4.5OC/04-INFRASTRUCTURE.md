# ScraperX Infrastructure
## Deployment, Scaling, and Operations Guide

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Classification:** Internal - Technical Documentation

---

## Table of Contents

1. [Infrastructure Overview](#1-infrastructure-overview)
2. [Server Specifications](#2-server-specifications)
3. [Network Architecture](#3-network-architecture)
4. [Docker Configuration](#4-docker-configuration)
5. [Docker Swarm Setup](#5-docker-swarm-setup)
6. [Service Deployment](#6-service-deployment)
7. [SSL and TLS Configuration](#7-ssl-and-tls-configuration)
8. [DNS Configuration](#8-dns-configuration)
9. [Scaling Operations](#9-scaling-operations)
10. [Backup and Recovery](#10-backup-and-recovery)

---

## 1. Infrastructure Overview

### 1.1 Hosting Provider

**Primary Provider:** Hetzner Cloud and Dedicated Servers

Hetzner is selected for:
- Excellent price-to-performance ratio
- European data centers with good global connectivity
- Dedicated server options for high-performance workloads
- Native Docker and Kubernetes support
- Reliable network infrastructure

### 1.2 Infrastructure Topology

```
+------------------------------------------------------------------+
|                    SCRAPERX INFRASTRUCTURE                        |
+------------------------------------------------------------------+
|                                                                   |
|  Internet                                                         |
|     |                                                             |
|     v                                                             |
|  +------------------+                                             |
|  | Cloudflare DNS   |  DNS management and DDoS protection        |
|  +--------+---------+                                             |
|           |                                                       |
|           v                                                       |
|  +--------+---------+                                             |
|  | Floating IP      |  95.xxx.xxx.xxx                            |
|  | (Primary)        |  Failover between managers                 |
|  +--------+---------+                                             |
|           |                                                       |
|           v                                                       |
|  +------------------------------------------------------------------+
|  |                    PRIVATE NETWORK (10.0.0.0/16)                |
|  |                                                                  |
|  |  +------------------+  +------------------+  +------------------+|
|  |  | Manager Node     |  | Worker Node 1    |  | Worker Node 2    ||
|  |  | 10.0.1.1         |  | 10.0.2.1         |  | 10.0.2.2         ||
|  |  |                  |  |                  |  |                  ||
|  |  | - Traefik        |  | - Browser Workers|  | - Browser Workers||
|  |  | - API Servers    |  | - Stealth Workers|  | - Stealth Workers||
|  |  | - PostgreSQL     |  |                  |  |                  ||
|  |  | - MinIO          |  |                  |  |                  ||
|  |  +------------------+  +------------------+  +------------------+|
|  |                                                                  |
|  |  +------------------+  +------------------+  +------------------+|
|  |  | Worker Node 3    |  | Worker Node 4    |  | Utility Node     ||
|  |  | 10.0.2.3         |  | 10.0.2.4         |  | 10.0.3.1         ||
|  |  |                  |  |                  |  |                  ||
|  |  | - HTTP Workers   |  | - HTTP Workers   |  | - Redis          ||
|  |  |                  |  |                  |  | - Prometheus     ||
|  |  |                  |  |                  |  | - Grafana        ||
|  |  +------------------+  +------------------+  +------------------+|
|  +------------------------------------------------------------------+
|                                                                   |
+------------------------------------------------------------------+
```

---

## 2. Server Specifications

### 2.1 Manager Node

**Purpose:** Swarm manager, API servers, databases, and object storage

| Specification | Value |
|---------------|-------|
| Provider | Hetzner Dedicated |
| Model | AX41-NVMe |
| CPU | AMD Ryzen 5 3600 (6 cores, 12 threads) |
| Memory | 64 GB DDR4 ECC |
| Storage | 2 x 512 GB NVMe SSD (RAID 1) |
| Network | 1 Gbit/s |
| Location | Falkenstein, Germany |
| Monthly Cost | Approximately 51 EUR |

**Services Deployed:**
- Traefik reverse proxy
- API server replicas (3)
- PostgreSQL database
- MinIO object storage

### 2.2 Browser Worker Nodes

**Purpose:** Execute JavaScript rendering with Playwright and Camoufox

| Specification | Value |
|---------------|-------|
| Provider | Hetzner Dedicated |
| Model | AX41-NVMe |
| CPU | AMD Ryzen 5 3600 (6 cores, 12 threads) |
| Memory | 64 GB DDR4 ECC |
| Storage | 2 x 512 GB NVMe SSD |
| Network | 1 Gbit/s |
| Count | 2-3 nodes |
| Monthly Cost | Approximately 51 EUR each |

**Services Deployed:**
- Browser worker containers (5 per node)
- Stealth worker containers (2 per node)

### 2.3 HTTP Worker Nodes

**Purpose:** Execute high-volume HTTP requests with TLS fingerprinting

| Specification | Value |
|---------------|-------|
| Provider | Hetzner Cloud |
| Model | CPX31 |
| CPU | 4 vCPU (AMD EPYC) |
| Memory | 8 GB |
| Storage | 160 GB SSD |
| Network | Shared |
| Count | 2-4 nodes |
| Monthly Cost | Approximately 15 EUR each |

**Services Deployed:**
- HTTP worker containers (20 per node)

### 2.4 Utility Node

**Purpose:** Redis, monitoring, and observability services

| Specification | Value |
|---------------|-------|
| Provider | Hetzner Cloud |
| Model | CPX21 |
| CPU | 3 vCPU |
| Memory | 4 GB |
| Storage | 80 GB SSD |
| Network | Shared |
| Monthly Cost | Approximately 10 EUR |

**Services Deployed:**
- Redis server
- Prometheus
- Grafana

### 2.5 Total Infrastructure Cost

| Component | Count | Unit Cost | Monthly Total |
|-----------|-------|-----------|---------------|
| Manager Node (AX41) | 1 | 51 EUR | 51 EUR |
| Browser Workers (AX41) | 3 | 51 EUR | 153 EUR |
| HTTP Workers (CPX31) | 4 | 15 EUR | 60 EUR |
| Utility Node (CPX21) | 1 | 10 EUR | 10 EUR |
| Floating IP | 1 | 4 EUR | 4 EUR |
| Private Network | 1 | Free | 0 EUR |
| **Total** | | | **278 EUR/month** |

---

## 3. Network Architecture

### 3.1 Private Network Configuration

```yaml
# Hetzner Private Network
network:
  name: scraperx-internal
  ip_range: 10.0.0.0/16
  subnets:
    - name: management
      ip_range: 10.0.1.0/24
      zone: eu-central
    - name: workers
      ip_range: 10.0.2.0/24
      zone: eu-central
    - name: utility
      ip_range: 10.0.3.0/24
      zone: eu-central
```

### 3.2 Firewall Rules

**Public Interface (eth0):**

| Port | Protocol | Source | Description |
|------|----------|--------|-------------|
| 22 | TCP | Admin IPs only | SSH access |
| 80 | TCP | Any | HTTP (redirect to HTTPS) |
| 443 | TCP | Any | HTTPS API |
| 2377 | TCP | Internal only | Swarm management |
| 7946 | TCP/UDP | Internal only | Swarm node communication |
| 4789 | UDP | Internal only | Overlay network |

**Private Interface (enp7s0):**

| Port | Protocol | Source | Description |
|------|----------|--------|-------------|
| All | All | 10.0.0.0/16 | Internal communication |

### 3.3 UFW Firewall Configuration

```bash
#!/bin/bash
# Firewall setup script for all nodes

# Reset UFW
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# SSH (restricted to admin IPs)
ufw allow from ADMIN_IP_1 to any port 22
ufw allow from ADMIN_IP_2 to any port 22

# HTTP/HTTPS (manager only)
ufw allow 80/tcp
ufw allow 443/tcp

# Docker Swarm (internal network only)
ufw allow from 10.0.0.0/16 to any port 2377 proto tcp
ufw allow from 10.0.0.0/16 to any port 7946 proto tcp
ufw allow from 10.0.0.0/16 to any port 7946 proto udp
ufw allow from 10.0.0.0/16 to any port 4789 proto udp

# All internal traffic
ufw allow from 10.0.0.0/16

# Enable UFW
ufw --force enable
```

---

## 4. Docker Configuration

### 4.1 Docker Installation

```bash
#!/bin/bash
# Docker installation script for Ubuntu 22.04

# Remove old versions
apt-get remove -y docker docker-engine docker.io containerd runc

# Install prerequisites
apt-get update
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Configure Docker daemon
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "default-address-pools": [
    {"base": "172.20.0.0/16", "size": 24}
  ]
}
EOF

# Restart Docker
systemctl restart docker
systemctl enable docker
```

### 4.2 Docker Daemon Configuration

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "default-address-pools": [
    {"base": "172.20.0.0/16", "size": 24}
  ],
  "metrics-addr": "0.0.0.0:9323",
  "experimental": true,
  "features": {
    "buildkit": true
  }
}
```

### 4.3 Browser Worker Dockerfile

```dockerfile
# Browser Worker Dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Install Node.js dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY dist/ ./dist/

# Install Playwright browsers
RUN npx playwright install chromium firefox

# Configure for container environment
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Memory settings for Chrome
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Run as non-root user
USER pwuser

CMD ["node", "dist/worker.js"]
```

### 4.4 HTTP Worker Dockerfile

```dockerfile
# HTTP Worker Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ curl

# Install Node.js dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY dist/ ./dist/

# Configure environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Run as non-root user
USER node

CMD ["node", "dist/http-worker.js"]
```

### 4.5 API Server Dockerfile

```dockerfile
# API Server Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache curl

# Install Node.js dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY dist/ ./dist/

# Configure environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run as non-root user
USER node

CMD ["node", "dist/api/server.js"]
```

---

## 5. Docker Swarm Setup

### 5.1 Initialize Swarm

```bash
#!/bin/bash
# Initialize Swarm on manager node

# Initialize Swarm with advertise address on private network
docker swarm init --advertise-addr 10.0.1.1

# Get join token for workers
WORKER_TOKEN=$(docker swarm join-token -q worker)
MANAGER_TOKEN=$(docker swarm join-token -q manager)

echo "Worker join command:"
echo "docker swarm join --token $WORKER_TOKEN 10.0.1.1:2377"

echo "Manager join command:"
echo "docker swarm join --token $MANAGER_TOKEN 10.0.1.1:2377"
```

### 5.2 Join Worker Nodes

```bash
#!/bin/bash
# Run on each worker node

docker swarm join --token SWMTKN-1-xxx 10.0.1.1:2377
```

### 5.3 Label Nodes

```bash
#!/bin/bash
# Label nodes for service placement

# Browser worker nodes
docker node update --label-add type=browser-worker worker-1
docker node update --label-add type=browser-worker worker-2
docker node update --label-add type=browser-worker worker-3

# HTTP worker nodes
docker node update --label-add type=http-worker worker-4
docker node update --label-add type=http-worker worker-5

# Utility node
docker node update --label-add type=utility utility-1
```

### 5.4 Create Networks

```bash
#!/bin/bash
# Create overlay networks

# Main application network
docker network create \
  --driver overlay \
  --attachable \
  --subnet 172.20.0.0/16 \
  scraperx-network

# Monitoring network
docker network create \
  --driver overlay \
  --attachable \
  --subnet 172.21.0.0/16 \
  monitoring-network
```

---

## 6. Service Deployment

### 6.1 Docker Stack File

```yaml
# docker-stack.yml
version: '3.8'

services:
  # ===================
  # REVERSE PROXY
  # ===================
  traefik:
    image: traefik:v3.0
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.swarmMode=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@scraperx.io"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--metrics.prometheus=true"
      - "--accesslog=true"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certificates:/letsencrypt
    networks:
      - scraperx-network
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.dashboard.rule=Host(`traefik.scraperx.io`)"
        - "traefik.http.routers.dashboard.service=api@internal"
        - "traefik.http.routers.dashboard.middlewares=auth"
        - "traefik.http.middlewares.auth.basicauth.users=${TRAEFIK_AUTH}"

  # ===================
  # API SERVERS
  # ===================
  api:
    image: scraperx/api:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://scraperx:${DB_PASSWORD}@postgres:5432/scraperx
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - API_RATE_LIMIT=100
    networks:
      - scraperx-network
    deploy:
      mode: replicated
      replicas: 3
      placement:
        constraints:
          - node.role == manager
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      rollback_config:
        parallelism: 1
        delay: 10s
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.api.rule=Host(`api.scraperx.io`)"
        - "traefik.http.routers.api.entrypoints=websecure"
        - "traefik.http.routers.api.tls.certresolver=letsencrypt"
        - "traefik.http.services.api.loadbalancer.server.port=3000"
        - "traefik.http.services.api.loadbalancer.healthcheck.path=/health"
        - "traefik.http.services.api.loadbalancer.healthcheck.interval=10s"

  # ===================
  # BROWSER WORKERS
  # ===================
  browser-worker:
    image: scraperx/browser-worker:latest
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - MAX_BROWSERS=5
      - CONCURRENCY=10
    volumes:
      - /dev/shm:/dev/shm
    networks:
      - scraperx-network
    deploy:
      mode: replicated
      replicas: 15
      placement:
        constraints:
          - node.labels.type == browser-worker
        max_replicas_per_node: 5
      update_config:
        parallelism: 2
        delay: 30s
        failure_action: rollback
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

  # ===================
  # STEALTH WORKERS
  # ===================
  stealth-worker:
    image: scraperx/stealth-worker:latest
    environment:
      - REDIS_URL=redis://redis:6379
      - MAX_BROWSERS=3
      - CONCURRENCY=5
    volumes:
      - /dev/shm:/dev/shm
    networks:
      - scraperx-network
    deploy:
      mode: replicated
      replicas: 6
      placement:
        constraints:
          - node.labels.type == browser-worker
        max_replicas_per_node: 2
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

  # ===================
  # HTTP WORKERS
  # ===================
  http-worker:
    image: scraperx/http-worker:latest
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - CONCURRENCY=50
    networks:
      - scraperx-network
    deploy:
      mode: replicated
      replicas: 80
      placement:
        constraints:
          - node.labels.type == http-worker
        max_replicas_per_node: 20
      update_config:
        parallelism: 10
        delay: 10s
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.1'
          memory: 128M

  # ===================
  # DATABASES
  # ===================
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=scraperx
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=scraperx
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - scraperx-network
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          cpus: '2'
          memory: 4G

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    networks:
      - scraperx-network
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.labels.type == utility
      resources:
        limits:
          memory: 2G

  # ===================
  # OBJECT STORAGE
  # ===================
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_ROOT_USER}
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
    volumes:
      - minio-data:/data
    networks:
      - scraperx-network
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.minio-console.rule=Host(`storage.scraperx.io`)"
        - "traefik.http.services.minio-console.loadbalancer.server.port=9001"

  # ===================
  # MONITORING
  # ===================
  prometheus:
    image: prom/prometheus:v2.48.0
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    volumes:
      - prometheus-config:/etc/prometheus
      - prometheus-data:/prometheus
    networks:
      - scraperx-network
      - monitoring-network
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.labels.type == utility
      resources:
        limits:
          memory: 1G

  grafana:
    image: grafana/grafana:10.2.0
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_USER}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - scraperx-network
      - monitoring-network
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.labels.type == utility
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.grafana.rule=Host(`grafana.scraperx.io`)"
        - "traefik.http.services.grafana.loadbalancer.server.port=3000"

networks:
  scraperx-network:
    external: true
  monitoring-network:
    external: true

volumes:
  traefik-certificates:
  postgres-data:
  redis-data:
  minio-data:
  prometheus-config:
  prometheus-data:
  grafana-data:
```

### 6.2 Deployment Script

```bash
#!/bin/bash
# deploy.sh - Deploy or update the ScraperX stack

set -e

# Load environment variables
source /opt/scraperx/.env

# Pull latest images
docker pull scraperx/api:latest
docker pull scraperx/browser-worker:latest
docker pull scraperx/stealth-worker:latest
docker pull scraperx/http-worker:latest

# Deploy stack
docker stack deploy -c /opt/scraperx/docker-stack.yml scraperx

# Wait for services to stabilize
echo "Waiting for services to stabilize..."
sleep 30

# Check service status
docker stack services scraperx

echo "Deployment complete"
```

---

## 7. SSL and TLS Configuration

### 7.1 Let's Encrypt with Traefik

Traefik handles automatic SSL certificate provisioning and renewal via Let's Encrypt.

Configuration is included in the docker-stack.yml above with:
- Automatic HTTPS redirect
- ACME TLS challenge
- Certificate storage in Docker volume

### 7.2 Internal TLS

For internal service communication, use self-signed certificates or mTLS:

```bash
#!/bin/bash
# Generate internal CA and certificates

# Create CA
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/CN=ScraperX Internal CA"

# Create server certificate
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr \
  -subj "/CN=*.scraperx.internal"
openssl x509 -req -days 365 -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt
```

---

## 8. DNS Configuration

### 8.1 Cloudflare DNS Records

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | api | 95.xxx.xxx.xxx | Yes |
| A | storage | 95.xxx.xxx.xxx | No |
| A | grafana | 95.xxx.xxx.xxx | Yes |
| A | traefik | 95.xxx.xxx.xxx | Yes |
| CNAME | www | scraperx.io | Yes |
| TXT | @ | v=spf1 include:_spf.google.com ~all | - |

### 8.2 Cloudflare Settings

| Setting | Value |
|---------|-------|
| SSL/TLS Mode | Full (strict) |
| Always Use HTTPS | On |
| Minimum TLS Version | 1.2 |
| Automatic HTTPS Rewrites | On |
| HTTP/2 | On |
| HTTP/3 (QUIC) | On |
| WebSockets | On |
| Brotli | On |

---

## 9. Scaling Operations

### 9.1 Manual Scaling

```bash
#!/bin/bash
# Scale services manually

# Scale API servers
docker service scale scraperx_api=5

# Scale browser workers
docker service scale scraperx_browser-worker=25

# Scale HTTP workers
docker service scale scraperx_http-worker=100
```

### 9.2 Auto-Scaling Script

```bash
#!/bin/bash
# auto-scale.sh - Monitor queue depth and scale workers

REDIS_CLI="docker exec $(docker ps -q -f name=redis) redis-cli"
MIN_WORKERS=10
MAX_WORKERS=100
SCALE_UP_THRESHOLD=1000
SCALE_DOWN_THRESHOLD=100

while true; do
  # Get queue depth
  QUEUE_DEPTH=$($REDIS_CLI LLEN bull:scrape:http:waiting)
  
  # Get current worker count
  CURRENT_WORKERS=$(docker service inspect scraperx_http-worker --format '{{.Spec.Mode.Replicated.Replicas}}')
  
  if [ $QUEUE_DEPTH -gt $SCALE_UP_THRESHOLD ] && [ $CURRENT_WORKERS -lt $MAX_WORKERS ]; then
    NEW_COUNT=$((CURRENT_WORKERS + 10))
    NEW_COUNT=$((NEW_COUNT > MAX_WORKERS ? MAX_WORKERS : NEW_COUNT))
    echo "Scaling up HTTP workers to $NEW_COUNT (queue depth: $QUEUE_DEPTH)"
    docker service scale scraperx_http-worker=$NEW_COUNT
  elif [ $QUEUE_DEPTH -lt $SCALE_DOWN_THRESHOLD ] && [ $CURRENT_WORKERS -gt $MIN_WORKERS ]; then
    NEW_COUNT=$((CURRENT_WORKERS - 10))
    NEW_COUNT=$((NEW_COUNT < MIN_WORKERS ? MIN_WORKERS : NEW_COUNT))
    echo "Scaling down HTTP workers to $NEW_COUNT (queue depth: $QUEUE_DEPTH)"
    docker service scale scraperx_http-worker=$NEW_COUNT
  fi
  
  sleep 60
done
```

### 9.3 Adding New Worker Nodes

```bash
#!/bin/bash
# add-worker.sh - Add a new worker node to the cluster

NEW_NODE_IP=$1
NODE_TYPE=$2  # browser-worker or http-worker

# SSH to new node and install Docker
ssh root@$NEW_NODE_IP << 'EOF'
  # Run Docker installation script
  curl -fsSL https://get.docker.com | sh
  
  # Configure Docker
  cat > /etc/docker/daemon.json <<DOCKER
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
DOCKER
  
  systemctl restart docker
EOF

# Get join token from manager
JOIN_TOKEN=$(docker swarm join-token -q worker)

# Join swarm
ssh root@$NEW_NODE_IP "docker swarm join --token $JOIN_TOKEN 10.0.1.1:2377"

# Label node
NODE_ID=$(docker node ls --filter "name=${NEW_NODE_IP}" --format "{{.ID}}")
docker node update --label-add type=$NODE_TYPE $NODE_ID

echo "Node $NEW_NODE_IP added as $NODE_TYPE"
```

---

## 10. Backup and Recovery

### 10.1 PostgreSQL Backup

```bash
#!/bin/bash
# backup-postgres.sh - Backup PostgreSQL database

BACKUP_DIR=/opt/scraperx/backups/postgres
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER=$(docker ps -q -f name=postgres)

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database
docker exec $CONTAINER pg_dump -U scraperx scraperx | gzip > $BACKUP_DIR/scraperx_$DATE.sql.gz

# Upload to S3/MinIO
mc cp $BACKUP_DIR/scraperx_$DATE.sql.gz minio/backups/postgres/

# Remove old local backups (keep 7 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: scraperx_$DATE.sql.gz"
```

### 10.2 Redis Backup

```bash
#!/bin/bash
# backup-redis.sh - Backup Redis data

BACKUP_DIR=/opt/scraperx/backups/redis
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER=$(docker ps -q -f name=redis)

# Create backup directory
mkdir -p $BACKUP_DIR

# Trigger BGSAVE
docker exec $CONTAINER redis-cli BGSAVE

# Wait for save to complete
sleep 10

# Copy RDB file
docker cp $CONTAINER:/data/dump.rdb $BACKUP_DIR/dump_$DATE.rdb
gzip $BACKUP_DIR/dump_$DATE.rdb

# Upload to MinIO
mc cp $BACKUP_DIR/dump_$DATE.rdb.gz minio/backups/redis/

# Cleanup old backups
find $BACKUP_DIR -name "*.rdb.gz" -mtime +3 -delete

echo "Redis backup completed: dump_$DATE.rdb.gz"
```

### 10.3 Disaster Recovery Procedure

```bash
#!/bin/bash
# disaster-recovery.sh - Restore from backups

# 1. Stop all services
docker stack rm scraperx

# 2. Restore PostgreSQL
LATEST_PG=$(mc ls minio/backups/postgres/ | tail -1 | awk '{print $5}')
mc cp minio/backups/postgres/$LATEST_PG /tmp/
gunzip /tmp/$LATEST_PG

# Start PostgreSQL temporarily
docker run -d --name pg-restore \
  -v postgres-data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=temp \
  postgres:16-alpine

# Restore database
cat /tmp/${LATEST_PG%.gz} | docker exec -i pg-restore psql -U scraperx

# Stop temporary container
docker stop pg-restore && docker rm pg-restore

# 3. Restore Redis
LATEST_REDIS=$(mc ls minio/backups/redis/ | tail -1 | awk '{print $5}')
mc cp minio/backups/redis/$LATEST_REDIS /tmp/
gunzip /tmp/$LATEST_REDIS
docker run -d --name redis-restore \
  -v redis-data:/data \
  redis:7-alpine
docker cp /tmp/${LATEST_REDIS%.gz} redis-restore:/data/dump.rdb
docker stop redis-restore && docker rm redis-restore

# 4. Redeploy stack
docker stack deploy -c /opt/scraperx/docker-stack.yml scraperx

echo "Disaster recovery complete"
```

### 10.4 Backup Schedule (Cron)

```cron
# PostgreSQL backup - every 6 hours
0 */6 * * * /opt/scraperx/scripts/backup-postgres.sh >> /var/log/scraperx/backup.log 2>&1

# Redis backup - every hour
0 * * * * /opt/scraperx/scripts/backup-redis.sh >> /var/log/scraperx/backup.log 2>&1

# MinIO backup - daily at 3 AM
0 3 * * * /opt/scraperx/scripts/backup-minio.sh >> /var/log/scraperx/backup.log 2>&1
```

---

## Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| DevOps Lead | | | |
| Technical Lead | | | |
| Security Engineer | | | |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2025 | | Initial document creation |
