FROM node:22-bullseye AS base

WORKDIR /app

RUN addgroup --system nodejs --gid 1001 \
    && adduser --system --uid 1001 --ingroup nodejs nodejs

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package*.json ./

RUN npm ci --omit=dev \
    && npm cache clean --force

FROM base AS build

COPY package*.json ./
RUN npm ci

COPY . .

ENV PRISMA_QUERY_ENGINE_TYPE="node-api"
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN npx prisma generate

RUN npm run build

RUN cp -rn prisma/generated/* dist/prisma/generated/ || true

FROM base AS production

WORKDIR /app

ENV NODE_ENV=production \
    NODE_OPTIONS="--no-warnings" \
    PRISMA_QUERY_ENGINE_TYPE="node-api"

COPY --from=build /app/dist ./dist

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY prisma ./prisma

RUN chown -R nodejs:nodejs /app
USER nodejs

CMD ["node", "dist/index.js"]

EXPOSE 8000
