# Builder stage
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:22-slim AS production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl tini \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

RUN addgroup --system nodejs && adduser --system --ingroup nodejs nodejs \
    && chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 8000
CMD ["tini", "--", "sh", "-c", "node dist/index.js"]
