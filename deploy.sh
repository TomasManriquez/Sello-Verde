#!/bin/bash

# Sello Verde Deployment Automation Script
# Ensures a senior-level workflow: Sync -> QA -> Build -> Deploy -> Verify

set -e # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 1. Code Synchronization
log "Synchronizing code with master branch..."
git checkout master || error "Failed to checkout master branch"
git pull --ff-only origin master || error "Failed to pull latest changes"

# 2. Quality Assurance Gate
log "Running QA checks..."

# Backend QA
log "Backend: Type-checking and Testing..."
(cd backend && npm install && npx tsc --noEmit && npm run test) || error "Backend QA failed"

# Frontend QA
log "Frontend: Type-checking..."
(cd frontend && npm install && npm run type-check) || error "Frontend QA failed"

# 3. Artifact Creation
log "Building production Docker images..."
docker compose -f docker-compose.prod.yml build --no-cache || error "Docker build failed"

# 4. Deployment
log "Deploying containers..."
docker compose -f docker-compose.prod.yml up -d || error "Deployment failed"

# 5. Verification
log "Verifying deployment health..."
sleep 30 # Wait for healthchecks to kick in

# Check if containers are healthy
for container in sello_verde_db sello_verde_backend sello_verde_frontend; do
  status=$(docker inspect --format='{{.State.Health.Status}}' $container)
  if [ "$status" != "healthy" ]; then
    error "Container $container is $status. Check logs: docker logs $container"
  fi
done

# El backend no publica puerto en producción: la prueba de humo pasa por el frontend
curl -fsI http://127.0.0.1:3080/api > /dev/null || error "Smoke test failed (http://127.0.0.1:3080/api)"

log "Deployment successful! 🚀"
log "Frontend + API: http://127.0.0.1:3080 (via Nginx)"
