# 🚀 Deployment Standard Operating Procedure (SOP) - Sello Verde

This document defines the professional deployment workflow to ensure stability, security, and consistency across environments.

## 1. Code Synchronization & Git Flow
- **Branching Strategy**: Use `master` for production.
- **Pull Protocol**: Always pull the latest changes and rebase to avoid merge conflicts.
  ```bash
  git checkout master
  git pull --ff-only origin master
  ```

## 2. Quality Assurance (QA) Gate
Before any build, the following checks MUST pass. Failures here stop the deployment.

### Backend (NestJS)
- **Type-Checking**: `npx tsc --noEmit` (Verifies TypeScript compilation).
- **Testing**: `npm run test` (Unit tests) and `npm run test:e2e` (Integration tests).

### Frontend (Next.js)
- **Type-Checking**: `npm run type-check`.
- **Build Verification**: `npm run build` (Validates static generation and bundling).

## 3. Artifact Creation & Environment
- **Optimization**: Use `Dockerfile.prod` for multi-stage builds to minimize image size and remove dev dependencies.
- **Env Sync**: Verify `.env` variables match the requirements in `docker-compose.prod.yml`.
- **Build**: 
  ```bash
  docker compose -f docker-compose.prod.yml build --no-cache
  ```

## 4. Database Strategy
- **Migrations**: Apply TypeORM migrations before starting the application to ensure schema alignment.
- **Seeding**: Run mockup data scripts only in development/staging environments.
- **Backup**: Perform a database dump before applying destructive migrations.

## 5. Deployment & Verification
- **Orchestration**: `docker compose -f docker-compose.prod.yml up -d`.
- **Health Checks**: 
    - Monitor container logs: `docker compose -f docker-compose.prod.yml logs -f`.
    - Verify Healthcheck status: `docker ps` (should show `healthy`).
    - API Endpoint test: `curl -I http://127.0.0.1:3080/api` (the backend has no public port in production).
    - Frontend Reachability: Verify Nginx $\rightarrow$ Frontend (Port 3080).

---

## 🛠 Quick Deployment Checklist
- [ ] Git pull latest `master`
- [ ] Backend: Type-check $\rightarrow$ Test $\rightarrow$ Build
- [ ] Frontend: Type-check $\rightarrow$ Build
- [ ] `.env` updated and verified
- [ ] Docker images rebuilt (prod)
- [ ] Database migrations applied
- [ ] Containers UP and `healthy`
- [ ] Smoke test successful
