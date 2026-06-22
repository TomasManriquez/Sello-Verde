FROM node:20-slim AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim AS production
WORKDIR /app

COPY --from=development /app/dist ./dist
COPY --from=development /app/node_modules ./node_modules
COPY package*.json ./

RUN mkdir -p /app/uploads && chmod 777 /app/uploads

EXPOSE 3001

CMD ["node", "dist/main"]
